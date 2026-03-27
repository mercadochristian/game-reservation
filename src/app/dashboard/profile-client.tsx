'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Pencil, X, Save, Phone, Heart, User, Calendar, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { fadeUpVariants } from '@/lib/animations'
import { useHasAnimated } from '@/lib/hooks/useHasAnimated'
import { useRequiredUser } from '@/lib/context/user-context'
import { profileEditSchema, type ProfileEditFormData } from '@/lib/validations/profile-edit'
import { SKILL_LEVEL_LABELS } from '@/lib/constants/labels'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  super_admin: 'Super Admin',
  facilitator: 'Facilitator',
  player: 'Player',
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 2) return `+${digits}`
  if (digits.length <= 5) return `+${digits.slice(0, 2)} ${digits.slice(2)}`
  if (digits.length <= 8) return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
  return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 12)}`
}

function parsePhoneForInput(raw: string | null): string {
  if (!raw) return '+63'
  return formatPhone(raw.replace(/\D/g, ''))
}

function stripPhone(display: string): string {
  return `+${display.replace(/\D/g, '')}`
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm text-foreground">{value || '—'}</p>
    </div>
  )
}

export default function ProfileClient() {
  const user = useRequiredUser()
  const router = useRouter()
  const hasAnimated = useHasAnimated()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<ProfileEditFormData>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
      birthday_month: user.birthday_month ?? undefined,
      birthday_day: user.birthday_day ?? undefined,
      birthday_year: user.birthday_year ?? undefined,
      gender: user.gender ?? '',
      player_contact_number: user.player_contact_number ?? '+63',
      emergency_contact_name: user.emergency_contact_name ?? '',
      emergency_contact_relationship: user.emergency_contact_relationship ?? '',
      emergency_contact_number: user.emergency_contact_number ?? '+63',
    },
  })

  const handlePhoneChange = useCallback((field: 'player_contact_number' | 'emergency_contact_number', displayValue: string) => {
    const raw = stripPhone(displayValue)
    setValue(field, raw, { shouldValidate: true })
  }, [setValue])

  const onSubmit = async (data: ProfileEditFormData) => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile/edit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to update profile.')
        return
      }

      toast.success('Profile updated successfully.')
      setEditing(false)
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    reset()
    setEditing(false)
  }

  const birthday = user.birthday_month && user.birthday_day
    ? `${MONTHS[user.birthday_month - 1]} ${user.birthday_day}${user.birthday_year ? `, ${user.birthday_year}` : ''}`
    : null

  const playerPhone = watch('player_contact_number')
  const emergencyPhone = watch('emergency_contact_number')

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground mt-1">View and manage your account information.</p>
          </div>
          {!editing && (
            <Button onClick={() => setEditing(true)} variant="outline" size="sm" className="gap-2">
              <Pencil size={16} />
              Edit
            </Button>
          )}
        </div>
      </motion.div>

      {!editing ? (
        /* ─── View Mode ─── */
        <div className="space-y-4">
          <motion.div custom={0} initial={hasAnimated.current ? false : 'hidden'} animate="visible" variants={fadeUpVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><User size={18} /> Basic Information</CardTitle>
                <CardAction>
                  <div className="flex gap-2">
                    <Badge variant="outline">{ROLE_LABELS[user.role] ?? user.role}</Badge>
                    {user.skill_level && (
                      <Badge variant="secondary">{SKILL_LEVEL_LABELS[user.skill_level] ?? user.skill_level}</Badge>
                    )}
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoRow label="First Name" value={user.first_name} />
                  <InfoRow label="Last Name" value={user.last_name} />
                  <InfoRow label="Email" value={user.email} />
                  <InfoRow label="Gender" value={user.gender} />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div custom={1} initial={hasAnimated.current ? false : 'hidden'} animate="visible" variants={fadeUpVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar size={18} /> Birthday & Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoRow label="Birthday" value={birthday} />
                  <InfoRow label="Contact Number" value={user.player_contact_number ? formatPhone(user.player_contact_number.replace(/\D/g, '')) : null} />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div custom={2} initial={hasAnimated.current ? false : 'hidden'} animate="visible" variants={fadeUpVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Heart size={18} /> Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <InfoRow label="Name" value={user.emergency_contact_name} />
                  <InfoRow label="Relationship" value={user.emergency_contact_relationship} />
                  <InfoRow label="Contact Number" value={user.emergency_contact_number ? formatPhone(user.emergency_contact_number.replace(/\D/g, '')) : null} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      ) : (
        /* ─── Edit Mode ─── */
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <motion.div custom={0} initial={hasAnimated.current ? false : 'hidden'} animate="visible" variants={fadeUpVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><User size={18} /> Basic Information</CardTitle>
                <CardAction>
                  <div className="flex gap-2">
                    <Badge variant="outline">{ROLE_LABELS[user.role] ?? user.role}</Badge>
                    {user.skill_level && (
                      <Badge variant="secondary">{SKILL_LEVEL_LABELS[user.skill_level] ?? user.skill_level}</Badge>
                    )}
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input id="first_name" {...register('first_name')} />
                    {errors.first_name && <p className="text-xs text-destructive mt-1">{errors.first_name.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input id="last_name" {...register('last_name')} />
                    {errors.last_name && <p className="text-xs text-destructive mt-1">{errors.last_name.message}</p>}
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={user.email} disabled className="opacity-60" />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <Input id="gender" {...register('gender')} />
                    {errors.gender && <p className="text-xs text-destructive mt-1">{errors.gender.message}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Shield size={14} className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Role and skill level cannot be changed here.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div custom={1} initial={hasAnimated.current ? false : 'hidden'} animate="visible" variants={fadeUpVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar size={18} /> Birthday & Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="birthday_month">Month</Label>
                    <select
                      id="birthday_month"
                      {...register('birthday_month', { valueAsNumber: true })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Select month</option>
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                      ))}
                    </select>
                    {errors.birthday_month && <p className="text-xs text-destructive mt-1">{errors.birthday_month.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="birthday_day">Day</Label>
                    <Input id="birthday_day" type="number" min={1} max={31} {...register('birthday_day', { valueAsNumber: true })} />
                    {errors.birthday_day && <p className="text-xs text-destructive mt-1">{errors.birthday_day.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="birthday_year">Year (optional)</Label>
                    <Input id="birthday_year" type="number" min={1900} max={new Date().getFullYear()} {...register('birthday_year', { setValueAs: v => v === '' ? undefined : Number(v) })} />
                    {errors.birthday_year && <p className="text-xs text-destructive mt-1">{errors.birthday_year.message}</p>}
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="player_contact_number">Contact Number</Label>
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-muted-foreground shrink-0" />
                    <Input
                      id="player_contact_number"
                      value={parsePhoneForInput(playerPhone)}
                      onChange={(e) => handlePhoneChange('player_contact_number', e.target.value)}
                      placeholder="+63 912 345 6789"
                    />
                  </div>
                  {errors.player_contact_number && <p className="text-xs text-destructive mt-1">{errors.player_contact_number.message}</p>}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div custom={2} initial={hasAnimated.current ? false : 'hidden'} animate="visible" variants={fadeUpVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Heart size={18} /> Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergency_contact_name">Name</Label>
                    <Input id="emergency_contact_name" {...register('emergency_contact_name')} />
                    {errors.emergency_contact_name && <p className="text-xs text-destructive mt-1">{errors.emergency_contact_name.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                    <Input id="emergency_contact_relationship" {...register('emergency_contact_relationship')} />
                    {errors.emergency_contact_relationship && <p className="text-xs text-destructive mt-1">{errors.emergency_contact_relationship.message}</p>}
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="emergency_contact_number">Contact Number</Label>
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-muted-foreground shrink-0" />
                    <Input
                      id="emergency_contact_number"
                      value={parsePhoneForInput(emergencyPhone)}
                      onChange={(e) => handlePhoneChange('emergency_contact_number', e.target.value)}
                      placeholder="+63 912 345 6789"
                    />
                  </div>
                  {errors.emergency_contact_number && <p className="text-xs text-destructive mt-1">{errors.emergency_contact_number.message}</p>}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div custom={3} initial={hasAnimated.current ? false : 'hidden'} animate="visible" variants={fadeUpVariants}>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={saving} className="gap-2">
                <X size={16} />
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </motion.div>
        </form>
      )}
    </div>
  )
}
