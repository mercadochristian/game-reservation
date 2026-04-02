import type { SupabaseClient } from '@supabase/supabase-js'
import type { Log, User } from '@/types'

interface LogWithUser extends Log {
  users?: Pick<User, 'email' | 'first_name' | 'last_name'> | null
}

interface GetLogsFilters {
  dateFrom?: string | null
  dateTo?: string | null
  level?: string | null
}

interface GetLogsPagination {
  page: number
  pageSize: number
}

/**
 * Fetches paginated logs with user details.
 * Runs count + data queries in parallel and returns both.
 * Used by dashboard/logs/page.tsx.
 */
export async function getLogs(
  supabase: SupabaseClient,
  filters: GetLogsFilters,
  pagination: GetLogsPagination,
): Promise<{ data: LogWithUser[]; count: number }> {
  const { dateFrom, dateTo, level } = filters
  const { page, pageSize } = pagination

  const buildQuery = () => {
    let query = (supabase.from('logs') as any).select('*, users(email, first_name, last_name)')

    if (dateFrom) {
      query = query.gte('created_at', new Date(dateFrom).toISOString())
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

  const [countResult, dataResult] = await Promise.all([
    buildQuery().select('*', { count: 'exact', head: true }),
    buildQuery()
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1),
  ])

  return {
    data: (dataResult.data ?? []) as LogWithUser[],
    count: (countResult.count ?? 0) as number,
  }
}
