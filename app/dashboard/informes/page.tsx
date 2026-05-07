export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { InformesNegociClient } from '@/components/features/informes-negoci-client'

export const metadata = { title: 'Informes — Tràmit Economistes' }

export default async function InformesPage() {
  const supabase = createClient()
  const currentYear = new Date().getFullYear()

  const [
    { data: balances },
    { data: requests },
    { data: profiles },
    { data: clients },
    { data: appointments },
    { data: tasks },
    { data: quotes },
  ] = await Promise.all([
    supabase.from('vacation_balances').select('*, profiles!vacation_balances_user_id_fkey(full_name, email)').eq('year', currentYear),
    supabase.from('absence_requests').select('*, profiles!absence_requests_user_id_fkey(full_name, email)').order('start_date', { ascending: false }),
    supabase.from('profiles').select('id, full_name, email').eq('active', true).order('full_name'),
    supabase.from('clients').select('id, name, status, client_type, created_at, estimated_value, last_contact_at'),
    supabase.from('appointments').select('id, topic, status, start_time, main_attendee_id').order('start_time', { ascending: false }),
    supabase.from('tasks').select('id, status, priority, assigned_to, created_at, done_at'),
    supabase.from('quotes').select('id, amount, status, created_at, client_id'),
  ])

  return (
    <InformesNegociClient
      balances={balances || []}
      requests={requests || []}
      profiles={profiles || []}
      clients={clients || []}
      appointments={appointments || []}
      tasks={tasks || []}
      quotes={quotes || []}
      currentYear={currentYear}
    />
  )
}
