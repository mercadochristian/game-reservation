'use client'

import { useState } from 'react'
import { Mail, MailOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scheduleId?: string
}

function getAuthErrorMessage(error: string): string {
  if (error.includes('invalid email')) return 'Please enter a valid email address'
  if (error.includes('rate limit')) return 'Too many login attempts. Please try again later.'
  return 'Something went wrong. Please try again.'
}

export function LoginModal({ open, onOpenChange, scheduleId }: LoginModalProps) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Please enter your email address')
      return
    }

    setIsLoading(true)

    try {
      const { origin } = window.location
      const redirectTo = scheduleId
        ? `${origin}/auth/callback?next=/?schedule=${scheduleId}`
        : `${origin}/auth/callback`

      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      })

      if (error) {
        toast.error(getAuthErrorMessage(error.message))
        return
      }

      setSent(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    // Reset state when modal closes
    if (!newOpen) {
      setTimeout(() => {
        setEmail('')
        setSent(false)
        setIsLoading(false)
      }, 200) // Let the close animation finish first
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        {!sent ? (
          <>
            <DialogHeader>
              <DialogTitle>Sign In</DialogTitle>
              <DialogDescription>
                We'll send you a secure sign-in link. No password needed.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSendMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !email.trim()}
              >
                {isLoading ? 'Sending...' : 'Send Magic Link'}
              </Button>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Check Your Email</DialogTitle>
              <DialogDescription>
                We sent a sign-in link to <span className="font-medium">{email}</span>. Click
                the link to continue.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-6">
              <MailOpen className="h-12 w-12 text-primary" />
              <p className="text-sm text-muted-foreground text-center">
                The link will expire in 24 hours. If you don't see it, check your spam folder.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setSent(false)
                  setEmail('')
                }}
              >
                Back
              </Button>
              <DialogClose className="flex-1">
                <Button variant="outline" className="w-full">
                  Done
                </Button>
              </DialogClose>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
