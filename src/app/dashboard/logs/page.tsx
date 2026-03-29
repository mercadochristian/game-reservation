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

  // Build base filtered query
  const buildQuery = () => {
    let query = (supabase.from('logs') as any).select('*, users(email, first_name, last_name)')

    if (dateFrom) {
      const startISO = new Date(dateFrom).toISOString()
      query = query.gte('created_at', startISO)
    }
    if (dateTo) {
      const endDate = new Date(dateTo)
      endDate.setDate(endDate.getDate() + 1)
      query = query.lt('created_at', endDate.toISOString())
    }
    if (level && level !== 'all') {
      query = query.eq('level', level)
    }

    return query
  }

  // Run count + data queries in parallel
  const [countResult, dataResult] = await Promise.all([
    buildQuery().select('*', { count: 'exact', head: true }),
    buildQuery()
      .order('created_at', { ascending: false })
      .range((currentPage - 1) * pageSize, currentPage * pageSize - 1),
  ])

  const logs: LogWithUser[] = dataResult.data ?? []
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
