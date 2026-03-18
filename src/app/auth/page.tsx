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
  if (message.includes('Password should be')) return 'Password must be at least 6 characters.'
  if (message.includes('Passwords do not match')) return 'Passwords do not match.'
  if (message.includes('only request this after')) return 'Please wait a moment before requesting another link.'
  if (message.includes('Unable to validate email')) return 'Please enter a valid email address.'
  return 'Something went wrong. Please try again.'
}

function AuthPageContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const returnUrl = searchParams.get('returnUrl') || '/'

  useEffect(() => {
    if (searchParams.get('error') === 'auth_callback_failed') {
      toast.error('The sign-in link has expired or is invalid. Please try again.')
    }
  }, [searchParams])

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    if (!email || !password) {
      toast.error('Please enter email and password')
      setIsLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(getAuthErrorMessage(error.message))
    } else {
      router.push(returnUrl)
    }
    setIsLoading(false)
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    if (!email || !password || !confirmPassword) {
      toast.error('Please fill in all fields')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      toast.error(getAuthErrorMessage(signUpError.message))
      setIsLoading(false)
      return
    }

    // If sign-up returns a session, user is already logged in
    if (data?.session) {
      toast.success('Account created! Redirecting...')
      router.push(returnUrl)
      setIsLoading(false)
      return
    }

    // If no session from sign-up (email confirmation required), try to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      toast.error(getAuthErrorMessage(signInError.message))
    } else {
      toast.success('Account created! Redirecting...')
      router.push(returnUrl)
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

            {/* Email + Password Form */}
            <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10 bg-muted border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:border-ring"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-muted border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:border-ring"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-foreground">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    className="bg-muted border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:border-ring"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              <Button
                type="submit"
                style={{ backgroundColor: branding.colors.primary }}
                className="w-full text-white font-semibold hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isSignUp ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : isSignUp ? (
                  'Create Account'
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Toggle between sign in and sign up */}
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              </span>
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setEmail('')
                  setPassword('')
                  setConfirmPassword('')
                }}
                className="text-foreground font-semibold hover:underline cursor-pointer"
              >
                {isSignUp ? 'Sign In' : 'Create Account'}
              </button>
            </div>

            {/* Magic Link (commented out for future use) */}
            {/* <div className="mt-6 pt-6 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  // Implement magic link sign in here
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Or use a magic link
              </button>
            </div> */}
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
