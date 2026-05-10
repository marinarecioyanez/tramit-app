export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { EquipClient } from '@/components/features/equip-client'

export const metadata = { title: 'Equip — Tràmit Economistes' }

export default async function EquipPage() {
  const supabase = createClient()
  const now = new Date()
  const currentYear = now.getFullYear()
  const today = now.toISOString().split('T')[0]

  const { data: requests } = await supabase
    .from('absence_requests')
    .select('*, profiles!absence_requests_user_id_fkey(full_name, color, email)')
    .order('created_at', { ascending: false })

  const { data: balances } = await supabase
    .from('vacation_balances')
    .select('*, profiles!vacation_balances_user_id_fkey(full_name, color)')
    .eq('year', currentYear)

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, color, role, email, phone, active')
    .eq('active', true)
    .order('full_name')

  const { data: holidays } = await supabase
    .from('holidays')
    .select('date')
    .eq('year', currentYear)

  const { data: closures } = await supabase
    .from('company_closures')
    .select('date')

  return (
    <EquipClient
      requests={requests || []}
      balances={balances || []}
      profiles={profiles || []}
      currentYear={currentYear}
    />
  )
}
