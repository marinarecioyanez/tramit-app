export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { TasquesClient } from '@/components/features/tasques-client'

export const metadata = { title: 'Tasques — Tràmit Economistes' }

export default async function TasquesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: tasks },
    { data: profiles },
    { data: clients },
    { data: templates },
    { data: timeEntries },
  ] = await Promise.all([
    supabase.from('tasks')
      .select('*, profiles!tasks_assigned_to_fkey(full_name, color), clients(name)')
      .order('created_at', { ascending: false }),
    supabase.from('profiles')
      .select('id, full_name, color')
      .eq('active', true).order('full_name'),
    supabase.from('clients')
      .select('id, name').order('name').limit(100),
    supabase.from('task_templates')
      .select('*').order('name'),
    supabase.from('time_entries')
      .select('*')
      .gte('date', new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]),
  ])

  return (
    <TasquesClient
      tasks={tasks || []}
      profiles={profiles || []}
      clients={clients || []}
      templates={(templates || []).map(t => ({ ...t, tasks: Array.isArray(t.tasks) ? t.tasks : [] }))}
      currentUserId={user!.id}
      timeEntries={timeEntries || []}
    />
  )
}
