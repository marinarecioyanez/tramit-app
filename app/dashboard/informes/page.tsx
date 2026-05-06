export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { InformesClient } from '@/components/features/informes-client'

export const metadata = { title: 'Informes — Tràmit Economistes' }

export default async function InformesPage() {
  const supabase = createClient()
  const currentYear = new Date().getFullYear()

  const { data: balances } = await supabase
    .from('vacation_balances')
    .select('*, profiles!vacation_balances_user_id_fkey(full_name, email)')
    .eq('year', currentYear)
    .order('profiles(full_name)')

  const { data: requests } = await supabase
    .from('absence_requests')
    .select('*, profiles!absence_requests_user_id_fkey(full_name, email)')
    .order('start_date', { ascending: false })

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('active', true)
    .order('full_name')

  return (
    <InformesClient
      balances={balances || []}
      requests={requests || []}
      profiles={profiles || []}
      currentYear={currentYear}
    />
  )
}
