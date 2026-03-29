'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard } from 'lucide-react'
import type { PaymentChannel } from '@/types'
import { QRCodeModal } from '@/components/qr-code-modal'

interface PaymentChannelsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinue: (channelId?: string) => void
}

export function PaymentChannelsModal({
  open,
  onOpenChange,
  onContinue,
}: PaymentChannelsModalProps) {
  const [channels, setChannels] = useState<PaymentChannel[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedChannelId, setSelectedChannelId] = useState<string | undefined>()
  const [viewingQrUrl, setViewingQrUrl] = useState<string | null>(null)

  // Fetch channels when modal opens
  useEffect(() => {
    if (!open) return

    const fetchChannels = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/payment-channels')
        if (!res.ok) throw new Error('Failed to fetch channels')
        const { channels } = await res.json()
        setChannels(channels || [])
      } catch (error) {
        console.error('[PaymentChannelsModal] Failed to fetch channels:', error)
        setChannels([])
      } finally {
        setLoading(false)
      }
    }

    fetchChannels()
  }, [open])

  const handleContinue = () => {
    onContinue(selectedChannelId)
    onOpenChange(false)
    setSelectedChannelId(undefined)
  }

  const providerColors: Record<string, string> = {
    GCash: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    Maya: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    BPI: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    BDO: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    Metrobank: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    UnionBank: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    Other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard size={20} />
            Where to Send Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select or note any of the following payment channels. Send your payment, then upload your receipt below.
          </p>

          {loading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="p-4 border border-border rounded-lg bg-muted/50 animate-pulse h-32" />
              ))}
            </div>
          ) : channels.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-border rounded-lg bg-muted/30">
              <p className="text-muted-foreground">
                No payment channels configured yet. Please contact an admin for payment details.
              </p>
            </div>
          ) : (
            <motion.div
              className="grid gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {channels.map((channel) => (
                <motion.div
                  key={channel.id}
                  onClick={() => setSelectedChannelId(channel.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedChannelId === channel.id
                      ? 'border-accent bg-accent/5 ring-2 ring-accent'
                      : 'border-border hover:border-accent/50 hover:bg-muted/50'
                  }`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{channel.name}</h4>
                        <p className="text-sm text-muted-foreground">{channel.account_holder_name}</p>
                      </div>
                      <Badge
                        className={providerColors[channel.provider] || providerColors.Other}
                      >
                        {channel.provider}
                      </Badge>
                    </div>

                    <div className="bg-muted/50 p-3 rounded border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Account Number</p>
                      <p className="font-mono text-sm font-semibold text-foreground select-all">
                        {channel.account_number}
                      </p>
                    </div>

                    {channel.qr_code_url && (
                      <div className="flex justify-center pt-2">
                        <div
                          role="button"
                          tabIndex={0}
                          className="w-32 h-32 bg-white p-2 rounded border border-border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setViewingQrUrl(channel.qr_code_url)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setViewingQrUrl(channel.qr_code_url)
                            }
                          }}
                        >
                          <img
                            src={channel.qr_code_url}
                            alt={`${channel.provider} QR Code`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleContinue}>
            {selectedChannelId ? 'Noted - Continue' : "I'll Pay Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

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
