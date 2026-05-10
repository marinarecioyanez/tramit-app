export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EquipClient } from '@/components/features/equip-client'

export const metadata = { title: 'Equip — Tràmit Economistes' }

export default async function WorkerEquipPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const currentYear = now.getFullYear()

  const { data: requests } = await supabase
    .from('absence_requests')
    .select('*, profiles!absence_requests_user_id_fkey(full_name, color, email)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: balances } = await supabase
    .from('vacation_balances')
    .select('*, profiles!vacation_balances_user_id_fkey(full_name, color)')
    .eq('user_id', user.id)
    .eq('year', currentYear)

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, color, role, email, phone, active')
    .eq('active', true)
    .order('full_name')

  return (
    <EquipClient
      requests={requests || []}
      balances={balances || []}
      profiles={profiles || []}
      currentYear={currentYear}
      isWorker={true}
      currentUserId={user.id}
    />
  )
}
