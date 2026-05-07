export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ClientDetailClient } from '@/components/features/client-detail-client'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('*, profiles!clients_responsible_id_fkey(full_name, color)')
    .eq('id', params.id)
    .single()

  if (!client) notFound()

  const { data: activity } = await supabase
    .from('client_activity')
    .select('*, profiles!client_activity_user_id_fkey(full_name, color)')
    .eq('client_id', params.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('client_id', params.id)
    .order('start_time', { ascending: false })
    .limit(10)

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, profiles!tasks_assigned_to_fkey(full_name, color)')
    .eq('client_id', params.id)
    .order('created_at', { ascending: false })

  const { data: quotes } = await supabase
    .from('quotes')
    .select('*')
    .eq('client_id', params.id)
    .order('created_at', { ascending: false })

  const { data: consents } = await supabase
    .from('client_consents')
    .select('*')
    .eq('client_id', params.id)

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, color')
    .eq('active', true)

  return (
    <ClientDetailClient
      client={client}
      activity={activity || []}
      appointments={appointments || []}
      tasks={tasks || []}
      quotes={quotes || []}
      consents={consents || []}
      profiles={profiles || []}
    />
  )
}
