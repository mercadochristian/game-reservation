'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { branding } from '@/lib/config/branding'
import {
  loginSchema,
  type LoginFormData,
} from '@/lib/validations/auth'

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'login' | 'magic'>('login')
  const router = useRouter()
  const supabase = createClient()

  const loginForm = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  async function handleEmailLogin(data: LoginFormData) {
    setIsLoading(true)
    setErrorMessage(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      setErrorMessage(error.message)
    } else {
      router.push('/')
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center px-4 py-8">
      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 sm:p-10">
        {/* Tabs */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-3 px-6 rounded-full font-semibold transition-all ${
              activeTab === 'login'
                ? 'bg-pink-500 text-white shadow-lg'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setActiveTab('magic')}
            className={`flex-1 py-3 px-6 rounded-full font-semibold transition-all ${
              activeTab === 'magic'
                ? 'bg-pink-500 text-white shadow-lg'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            Magic Link
          </button>
        </div>

        {/* Login Tab */}
        {activeTab === 'login' && (
          <>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Welcome Back</h2>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <form onSubmit={loginForm.handleSubmit(handleEmailLogin)} className="space-y-6">
              {/* Email Field */}
              <div>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className="w-full h-14 px-5 pr-12 bg-blue-50 border-0 text-gray-900 placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-pink-500 focus:ring-offset-0 text-base"
                    {...loginForm.register('email')}
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-500">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                </div>
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-red-600 mt-2">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full h-14 px-5 pr-12 bg-blue-50 border-0 text-gray-900 placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-pink-500 focus:ring-offset-0 text-base"
                    {...loginForm.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M15.171 13.591l1.472 1.473a1 1 0 001.414-1.414l-14-14a1 1 0 00-1.414 1.414l1.473 1.473A10.014 10.014 0 00.458 10c1.274 4.057 5.065 7 9.542 7 2.181 0 4.322-.665 6.171-1.909z" />
                      </svg>
                    )}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-red-600 mt-2">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full h-14 font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-95 transition-all rounded-xl border-0 text-base"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Login'}
              </Button>
            </form>
          </>
        )}

        {/* Magic Link Tab */}
        {activeTab === 'magic' && (
          <>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign in with Magic Link</h2>
            <p className="text-gray-600 text-sm mb-8">We'll send you a secure link via email</p>

            <form onSubmit={(e) => {
              e.preventDefault()
              // Implement magic link logic
            }} className="space-y-6">
              <div>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    className="w-full h-14 px-5 pr-12 bg-blue-50 border-0 text-gray-900 placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-pink-500 focus:ring-offset-0 text-base"
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-500">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-14 font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-95 transition-all rounded-xl border-0 text-base"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Magic Link'}
              </Button>
            </form>
          </>
        )}

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-gray-500">or continue with</span>
          </div>
        </div>

        {/* Google Button */}
        <Button
          type="button"
          className="w-full h-12 font-semibold text-gray-900 bg-gray-100 hover:bg-gray-200 transition-all rounded-xl flex items-center justify-center gap-2 border-0"
          onClick={() => {
            supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: `${window.location.origin}/auth/callback`,
              },
            })
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </Button>
      </div>
    </div>
  )
}
