import type { Metadata } from 'next'
import './globals.css'
import { getBrandingMeta } from '@/lib/config/branding'
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { FloatingHomeButton } from "@/components/floating-home-button";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const brandingMeta = getBrandingMeta()

export const metadata: Metadata = {
  title: brandingMeta.title,
  description: brandingMeta.description,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn("font-sans dark", geist.variable)}>
      <body>
        {children}
        <FloatingHomeButton />
        <Toaster />
      </body>
    </html>
  )
}
