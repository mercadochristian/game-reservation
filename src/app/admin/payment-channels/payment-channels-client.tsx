'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, CreditCard, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/ui/page-header'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { QRCodeModal } from '@/components/qr-code-modal'
import { createClient } from '@/lib/supabase/client'
import { paymentChannelSchema, PaymentChannelFormData, PAYMENT_PROVIDERS } from '@/lib/validations/payment-channel'
import { PaymentChannel } from '@/types'
import { fadeUpVariants } from '@/lib/animations'
import { getUserFriendlyMessage } from '@/lib/errors/messages'
import { useCrudDialog } from '@/lib/hooks/useCrudDialog'
import { logActivity, logError } from '@/lib/logger'

interface PaymentChannelsClientProps {
  initialChannels: PaymentChannel[]
}

export function PaymentChannelsClient({ initialChannels }: PaymentChannelsClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [channels, setChannels] = useState<PaymentChannel[]>(initialChannels)
  const crudDialog = useCrudDialog()
  const [qrFile, setQrFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [viewingQrUrl, setViewingQrUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<PaymentChannelFormData>({
    resolver: zodResolver(paymentChannelSchema),
    defaultValues: {
      name: '',
      provider: 'GCash',
      account_number: '',
      account_holder_name: '',
      is_active: true,
    },
  })

  // Handle QR file selection
  const handleQrFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be smaller than 5MB')
      return
    }

    setQrFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  // Handle create/edit
  const onSubmit = async (formData: PaymentChannelFormData) => {
    try {
      const user = await supabase.auth.getUser()
      const userId = user.data.user?.id

      let qrCodeUrl = null

      // If a new QR file is selected, upload it
      if (qrFile && !crudDialog.editingId) {
        const formDataObj = new FormData()
        formDataObj.append('file', qrFile)

        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token

        const uploadRes = await fetch('/api/admin/payment-channels/upload-qr', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${token}`,
          },
          body: formDataObj,
        })

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json()
          throw new Error(errorData.error || 'Failed to upload QR code')
        }

        const { publicUrl } = await uploadRes.json()
        qrCodeUrl = publicUrl
      }

      if (crudDialog.editingId) {
        // Update - only include updatable fields
        const updateData: Record<string, any> = {
          name: formData.name,
          provider: formData.provider,
          account_number: formData.account_number,
          account_holder_name: formData.account_holder_name,
          is_active: formData.is_active,
        }

        // If a new QR file was selected for edit, include it
        if (qrFile && qrCodeUrl) {
          updateData.qr_code_url = qrCodeUrl
        }

        const { error } = await (supabase.from('payment_channels') as any).update(updateData).eq('id', crudDialog.editingId)

        if (error) throw error

        if (userId) {
          await logActivity('payment_channel.update', userId, {
            channel_id: crudDialog.editingId,
            provider: formData.provider,
            name: formData.name,
            qr_updated: !!qrCodeUrl,
          })
        }

        toast.success('Payment channel updated')
        setChannels((prev) =>
          prev.map((ch) => (ch.id === crudDialog.editingId ? { ...ch, ...updateData } : ch))
        )
        router.refresh()
      } else {
        // Create
        if (!user.data.user) {
          toast.error('Not authenticated')
          return
        }

        const insertData = {
          name: formData.name,
          provider: formData.provider,
          account_number: formData.account_number,
          account_holder_name: formData.account_holder_name,
          is_active: formData.is_active,
          created_by: user.data.user.id,
          qr_code_url: qrCodeUrl,
        }

        const { data, error } = await (supabase.from('payment_channels') as any).insert([insertData]).select()

        if (error) throw error
        if (data?.[0]) {
          await logActivity('payment_channel.create', user.data.user.id, {
            channel_id: data[0].id,
            provider: formData.provider,
            name: formData.name,
            has_qr: !!qrCodeUrl,
          })

          setChannels((prev) => [data[0], ...prev])
          toast.success('Payment channel created')
          router.refresh()
        }
      }

      reset()
      setQrFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      crudDialog.onCloseDialog()
    } catch (error) {
      const userId = (await supabase.auth.getUser()).data.user?.id
      if (userId) {
        await logError(
          crudDialog.editingId ? 'payment_channel.update_failed' : 'payment_channel.create_failed',
          error,
          userId,
          { provider: formData.provider }
        )
      }
      console.error('[PaymentChannels] Failed to save channel:', error)
      toast.error(crudDialog.editingId ? 'Failed to update channel' : 'Failed to create channel', {
        description: getUserFriendlyMessage(error),
      })
    }
  }

  // Handle edit
  const handleEdit = (channel: PaymentChannel) => {
    reset()
    setValue('name', channel.name)
    setValue('provider', channel.provider as any)
    setValue('account_number', channel.account_number)
    setValue('account_holder_name', channel.account_holder_name)
    setValue('is_active', channel.is_active)
    setQrFile(null)
    if (channel.qr_code_url) {
      setPreviewUrl(channel.qr_code_url)
    } else {
      setPreviewUrl(null)
    }
    crudDialog.onOpenEdit(channel.id)
  }

  // Handle toggle active
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const user = await supabase.auth.getUser()
      const { error } = await (supabase.from('payment_channels') as any).update({ is_active: !currentStatus }).eq('id', id)

      if (error) throw error

      const channel = channels.find((ch) => ch.id === id)
      if (user.data.user?.id && channel) {
        await logActivity('payment_channel.toggle_status', user.data.user.id, {
          channel_id: id,
          provider: channel.provider,
          new_status: !currentStatus,
        })
      }

      setChannels((prev) => prev.map((ch) => (ch.id === id ? { ...ch, is_active: !currentStatus } : ch)))
      toast.success(currentStatus ? 'Channel deactivated' : 'Channel activated')
      router.refresh()
    } catch (error) {
      const userId = (await supabase.auth.getUser()).data.user?.id
      if (userId) {
        await logError('payment_channel.toggle_failed', error, userId, { channel_id: id })
      }
      console.error('[PaymentChannels] Failed to toggle channel status:', error)
      toast.error('Failed to update channel status', { description: getUserFriendlyMessage(error) })
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!crudDialog.deleteTarget) return
    try {
      const user = await supabase.auth.getUser()
      const channel = channels.find((ch) => ch.id === crudDialog.deleteTarget?.id)

      const { error } = await (supabase.from('payment_channels') as any).delete().eq('id', crudDialog.deleteTarget.id)

      if (error) throw error

      if (user.data.user?.id && channel) {
        await logActivity('payment_channel.delete', user.data.user.id, {
          channel_id: crudDialog.deleteTarget.id,
          provider: channel.provider,
          name: channel.name,
        })
      }

      setChannels((prev) => prev.filter((ch) => ch.id !== crudDialog.deleteTarget?.id))
      crudDialog.onCancelDelete()
      toast.success('Payment channel deleted')
      router.refresh()
    } catch (error) {
      const userId = (await supabase.auth.getUser()).data.user?.id
      if (userId) {
        await logError('payment_channel.delete_failed', error, userId, {
          channel_id: crudDialog.deleteTarget?.id,
        })
      }
      console.error('[PaymentChannels] Failed to delete channel:', error)
      toast.error('Failed to delete payment channel', { description: getUserFriendlyMessage(error) })
    }
  }

  const handleOpenDialog = () => {
    reset()
    setQrFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    crudDialog.onOpenCreate()
  }

  const handleCloseDialog = () => {
    reset()
    setQrFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    crudDialog.onCloseDialog()
  }

  const tableContent = (channels ?? []).length === 0 ? (
    <div className="p-12 text-center">
      <div className="flex justify-center mb-4">
        <CreditCard size={48} className="text-muted-foreground/40" />
      </div>
      <p className="text-muted-foreground mb-4">No payment channels yet. Create one to get started.</p>
      <Button onClick={handleOpenDialog} variant="outline" className="gap-2">
        <Plus size={18} />
        Add First Channel
      </Button>
    </div>
  ) : (
    <Table>
      <TableHeader>
        <TableRow className="border-border">
          <TableHead>Channel Name</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Account Number</TableHead>
          <TableHead className="hidden sm:table-cell">QR Code</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(channels ?? []).map((channel) => (
          <TableRow key={channel.id} className="border-border hover:bg-muted/50 transition-colors">
            <TableCell className="py-4">
              <div>
                <div className="font-medium text-foreground">{channel.name}</div>
                <div className="text-sm text-muted-foreground">{channel.account_holder_name}</div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{channel.provider}</Badge>
            </TableCell>
            <TableCell className="font-mono text-sm text-muted-foreground">{channel.account_number}</TableCell>
            <TableCell className="hidden sm:table-cell">
              {channel.qr_code_url ? (
                <div
                  className="w-12 h-12 bg-muted rounded border border-border cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setViewingQrUrl(channel.qr_code_url)}
                >
                  <img src={channel.qr_code_url} alt="QR Code" className="w-full h-full object-cover rounded" />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              <Badge variant={channel.is_active ? 'default' : 'secondary'} className="whitespace-nowrap">
                {channel.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell className="text-right py-4">
              <div className="flex justify-end gap-1 flex-wrap">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleToggleActive(channel.id, channel.is_active)}
                  title={channel.is_active ? 'Deactivate' : 'Activate'}
                >
                  {channel.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(channel)} title="Edit">
                  <Pencil size={18} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => crudDialog.onOpenDeleteConfirm(channel.id, channel.name)}
                  title="Delete"
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  return (
    <>
      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        <PageHeader
          breadcrumb="Payment Channels"
          title="Payment Channels"
          count={(channels ?? []).length}
          description="Manage payment methods for game registrations"
          action={{
            label: 'New Channel',
            icon: Plus,
            onClick: handleOpenDialog,
          }}
        />

        {/* Table */}
        <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg overflow-hidden">
          {tableContent}
        </motion.div>
      </div>

      {/* Dialog for Create/Edit */}
      <Dialog open={crudDialog.isOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{crudDialog.editingId ? 'Edit Channel' : 'Create Channel'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Channel Name *</Label>
              <Input
                id="name"
                placeholder="e.g., GCash - Main"
                {...register('name')}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="provider">Provider *</Label>
              <select
                id="provider"
                {...register('provider')}
                className={`w-full px-3 py-2 border rounded-md bg-background text-foreground ${
                  errors.provider ? 'border-destructive' : 'border-border'
                }`}
              >
                <option value="">Select a provider</option>
                {PAYMENT_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {errors.provider && <p className="text-xs text-destructive mt-1">{errors.provider.message}</p>}
            </div>

            <div>
              <Label htmlFor="account_number">Account Number / Mobile Number *</Label>
              <Input
                id="account_number"
                placeholder="e.g., 09171234567"
                {...register('account_number')}
                className={errors.account_number ? 'border-destructive' : ''}
              />
              {errors.account_number && <p className="text-xs text-destructive mt-1">{errors.account_number.message}</p>}
            </div>

            <div>
              <Label htmlFor="account_holder_name">Account Holder Name *</Label>
              <Input
                id="account_holder_name"
                placeholder="e.g., John Doe"
                {...register('account_holder_name')}
                className={errors.account_holder_name ? 'border-destructive' : ''}
              />
              {errors.account_holder_name && <p className="text-xs text-destructive mt-1">{errors.account_holder_name.message}</p>}
            </div>

            {/* QR Code Upload */}
            <div>
              <Label htmlFor="qr_file">QR Code Image</Label>
              <div className="mt-2">
                <input
                  ref={fileInputRef}
                  id="qr_file"
                  type="file"
                  accept="image/*"
                  onChange={handleQrFileSelect}
                  className="hidden"
                />
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full gap-2 justify-center"
                  >
                    <ImageIcon size={18} />
                    {qrFile ? 'Change Image' : 'Upload QR Code'}
                  </Button>

                  {previewUrl && (
                    <div className="p-3 border border-border rounded-lg bg-muted/50">
                      <div className="w-24 h-24 mx-auto">
                        <img src={previewUrl} alt="QR Code Preview" className="w-full h-full object-cover rounded" />
                      </div>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        {qrFile ? 'New image' : 'Current image'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="is_active"
                type="checkbox"
                {...register('is_active')}
                className="w-4 h-4 rounded border-border"
              />
              <Label htmlFor="is_active" className="mb-0 cursor-pointer">
                Active
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">{crudDialog.editingId ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for Delete Confirmation */}
      <ConfirmDeleteDialog
        open={crudDialog.deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) crudDialog.onCancelDelete()
        }}
        title="Delete Payment Channel?"
        targetName={crudDialog.deleteTarget?.label}
        warningText="This action cannot be undone. Players may have selected this channel."
        onConfirm={handleDelete}
        onCancel={() => crudDialog.onCancelDelete()}
      />

      <QRCodeModal
        open={!!viewingQrUrl}
        onOpenChange={(open) => {
          if (!open) setViewingQrUrl(null)
        }}
        url={viewingQrUrl}
      />
    </>
  )
}
