'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { fadeUpVariants } from '@/lib/animations'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { branding } from '@/lib/config/branding'

function getAuthErrorMessage(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Incorrect email or password. Please try again.'
  if (message.includes('Email not confirmed')) return 'Please confirm your email before signing in.'
  if (message.includes('User already registered')) return 'An account with this email already exists.'
  if (message.includes('only request this after')) return 'Please wait a moment before requesting another link.'
  if (message.includes('Unable to validate email')) return 'Please enter a valid email address.'
  return 'Something went wrong. Please try again.'
}


function AuthPageContent() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    if (searchParams.get('error') === 'auth_callback_failed') {
      toast.error('The sign-in link has expired or is invalid. Please try again.')
    }
  }, [searchParams])

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    const email = (e.currentTarget.elements.namedItem('magic-email') as HTMLInputElement)?.value
    if (!email) {
      toast.error('Please enter an email address')
      setIsLoading(false)
      return
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      toast.error(getAuthErrorMessage(error.message))
    } else {
      toast.success('Check your email for the magic link!')
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-background">
      <motion.div initial="hidden" animate="visible" variants={fadeUpVariants}>
        <Card className="w-full max-w-md bg-card border-border shadow-2xl">
          <div className="p-8 sm:p-10">
          {/* Brand Header */}
          <div className="mb-8 text-center">
            {branding.logo && (
              <div className="flex justify-center mb-4">
                <img
                  src={branding.logo.url}
                  alt={branding.logo.altText}
                  width={branding.logo.width}
                  height={branding.logo.height}
                  className="h-24 w-auto"
                />
              </div>
            )}
            <h1 className="text-2xl font-bold text-foreground mb-2">{branding.name}</h1>
            <p className="text-muted-foreground text-sm italic">"{branding.tagline}"</p>
          </div>

          {/* Magic Link Form */}
          <form onSubmit={handleMagicLink} className="space-y-5">
            <p className="text-sm text-muted-foreground">
              We'll send you a secure sign-in link via email. No password needed.
            </p>

            <div className="space-y-2">
              <Label htmlFor="magic-email" className="text-foreground">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="magic-email"
                  name="magic-email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10 bg-muted border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:border-ring"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              style={{ backgroundColor: branding.colors.primary }}
              className="w-full text-white font-semibold hover:opacity-90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Magic Link'
              )}
            </Button>
          </form>
        </div>
      </Card>
      </motion.div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageContent />
    </Suspense>
  )
}
