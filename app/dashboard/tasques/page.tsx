export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { TasquesClient } from '@/components/features/tasques-client'

export const metadata = { title: 'Tasques — Tràmit Economistes' }

export default async function TasquesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, profiles!tasks_assigned_to_fkey(full_name, color), clients(name)')
    .order('created_at', { ascending: false })

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, color')
    .eq('active', true)
    .order('full_name')

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .order('name')
    .limit(50)

  return (
    <TasquesClient
      tasks={tasks || []}
      profiles={profiles || []}
      clients={clients || []}
      currentUserId={user!.id}
    />
  )
}
