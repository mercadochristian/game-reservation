import { createServiceClient } from '@/lib/supabase/service'
import { getStringParam, getIntParam } from '@/lib/utils/search-params'
import type { Log, User } from '@/types'
import { LogsClient } from './logs-client'

interface LogWithUser extends Log {
  users?: Pick<User, 'email' | 'first_name' | 'last_name'> | null
}

const DEFAULT_PAGE_SIZE = 15

export default async function ErrorLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const supabase = createServiceClient()

  const dateFrom = getStringParam(params, 'dateFrom')
  const dateTo = getStringParam(params, 'dateTo')
  const level = getStringParam(params, 'level', 'all')
  const currentPage = getIntParam(params, 'page', 1)
  const pageSize = getIntParam(params, 'pageSize', DEFAULT_PAGE_SIZE)

  // Build filter conditions shared by count and data queries
  const applyFilters = <T extends { gte: (col: string, val: string) => T; lt: (col: string, val: string) => T; eq: (col: string, val: string) => T }>(query: T): T => {
    let q = query
    if (dateFrom) {
      q = q.gte('created_at', new Date(dateFrom).toISOString())
    }
    if (dateTo) {
      const endDate = new Date(dateTo)
      endDate.setDate(endDate.getDate() + 1)
      q = q.lt('created_at', endDate.toISOString())
    }
    if (level && level !== 'all') {
      q = q.eq('level', level)
    }
    return q
  }

  // Run count + data queries in parallel
  // Foreign key join (logs -> users) cannot be validated without Relationships in Database type
  const [countResult, dataResult] = await Promise.all([
    applyFilters(supabase.from('logs').select('*', { count: 'exact', head: true })),
    applyFilters(supabase.from('logs').select('*, users(email, first_name, last_name)'))
      .order('created_at', { ascending: false })
      .range((currentPage - 1) * pageSize, currentPage * pageSize - 1),
  ])

  const logs = (dataResult.data ?? []) as unknown as LogWithUser[]
  const totalCount: number = countResult.count ?? 0

  return (
    <LogsClient
      logs={logs}
      totalCount={totalCount}
      currentPage={currentPage}
      pageSize={pageSize}
      filters={{ dateFrom, dateTo, level }}
    />
  )
}
