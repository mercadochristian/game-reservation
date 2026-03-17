"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      data-slot="toaster"
      theme="dark"
      position="top-right"
      richColors
      toastOptions={{
        style: {
          background: "var(--card)",
          color: "var(--card-foreground)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          fontSize: "0.875rem",
          fontFamily: "var(--font-sans), -apple-system, sans-serif",
        },
        classNames: {
          title: "font-medium",
          description: "text-sm",
          error: "!bg-destructive/10 !text-destructive !border-destructive/30",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
