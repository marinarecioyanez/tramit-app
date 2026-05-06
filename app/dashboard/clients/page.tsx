export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { ClientsClient } from '@/components/features/clients-client'

export const metadata = { title: 'Clients — Tràmit Economistes' }

export default async function ClientsPage() {
  const supabase = createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('*, profiles!clients_responsible_id_fkey(full_name)')
    .order('created_at', { ascending: false })

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('active', true)
    .order('full_name')

  return <ClientsClient clients={clients || []} profiles={profiles || []} />
}
