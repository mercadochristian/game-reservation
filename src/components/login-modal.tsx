'use client'

import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scheduleId?: string
}

export function LoginModal({ open, onOpenChange, scheduleId }: LoginModalProps) {
  const router = useRouter()

  const handleSignIn = () => {
    const returnUrl = scheduleId ? `/?schedule=${scheduleId}` : '/'
    router.push(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Sign In</DialogTitle>
          <DialogDescription>
            Sign in with your email and password to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Button onClick={handleSignIn} className="w-full">
            Sign In
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Don't have an account? You can create one on the sign in page.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
