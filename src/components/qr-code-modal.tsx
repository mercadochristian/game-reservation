'use client'

import { X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface QRCodeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string | null
}

export function QRCodeModal({ open, onOpenChange, url }: QRCodeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>QR Code</DialogTitle>
        </DialogHeader>
        {url && (
          <div className="flex flex-col items-center justify-center gap-4">
            <img
              src={url}
              alt="QR Code"
              className="max-w-full max-h-96 border border-border rounded-lg bg-white p-2"
            />
            <p className="text-xs text-muted-foreground text-center">
              Click the image to save or scan with your mobile device
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
