export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { VacancesWorkerClient } from '@/components/features/vacances-worker-client'

export const metadata = { title: 'Vacances — Tràmit Economistes' }

export default async function WorkerVacancesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: balance } = await supabase
    .from('vacation_balances')
    .select('*')
    .eq('user_id', user!.id)
    .eq('year', new Date().getFullYear())
    .single()

  const { data: requests } = await supabase
    .from('absence_requests')
    .select('*')
    .eq('user_id', user!.id)
    .eq('type', 'vacation')
    .order('created_at', { ascending: false })

  const { data: holidays } = await supabase
    .from('holidays')
    .select('date')
    .eq('year', new Date().getFullYear())

  const { data: closures } = await supabase
    .from('company_closures')
    .select('date')

  return (
    <VacancesWorkerClient
      balance={balance}
      requests={requests || []}
      holidays={holidays?.map(h => h.date) || []}
      closures={closures?.map(c => c.date) || []}
      userId={user!.id}
    />
  )
}
