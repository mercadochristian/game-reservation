'use client'

import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface PageHeaderAction {
  label: string
  icon: LucideIcon
  onClick: () => void
}

interface PageHeaderProps {
  breadcrumb: string
  title: string
  count?: number
  description?: string
  action?: PageHeaderAction
}

export function PageHeader({ breadcrumb, title, count, description, action }: PageHeaderProps) {
  return (
    <>
      <div className="text-sm text-muted-foreground mb-6">
        <span>Dashboard</span>
        <span className="mx-2">/</span>
        <span className="text-foreground">{breadcrumb}</span>
      </div>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground">{title}</h1>
              {count !== undefined && (
                <Badge variant="outline" className="text-xs">
                  {count}
                </Badge>
              )}
            </div>
            {description && <p className="text-muted-foreground">{description}</p>}
          </div>
          {action && (
            <Button onClick={action.onClick} className="gap-2 w-full sm:w-auto">
              <action.icon size={20} />
              {action.label}
            </Button>
          )}
        </div>
      </motion.div>
    </>
  )
}
