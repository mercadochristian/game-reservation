import { createServiceClient } from '@/lib/supabase/service'

/**
 * Fetches the count of recent registrations (last 5)
 * Used to display recent activity on the dashboard
 */
export async function getRecentRegistrationsCount(): Promise<number> {
  try {
    const client = createServiceClient()
    const { count, error } = await client
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('Error fetching recent registrations count:', error)
      return 0
    }

    return count ?? 0
  } catch (error) {
    console.error('Error fetching recent registrations count:', error)
    return 0
  }
}

/**
 * Fetches pending payments statistics
 * Returns count of pending payments and total amount due
 */
export async function getPendingPaymentsStats(): Promise<{
  count: number
  total: number
}> {
  try {
    const client = createServiceClient()
    const { data, error } = await client
      .from('registration_payments')
      .select('id, required_amount')
      .eq('payment_status', 'pending')

    if (error) {
      console.error('Error fetching pending payments stats:', error)
      return { count: 0, total: 0 }
    }

    const count = data?.length ?? 0
    const total = data?.reduce((sum, item) => sum + (item.required_amount ?? 0), 0) ?? 0

    return { count, total }
  } catch (error) {
    console.error('Error fetching pending payments stats:', error)
    return { count: 0, total: 0 }
  }
}
