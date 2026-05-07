export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { AgendaClient } from '@/components/features/agenda-client'
import { NovaCitaButton } from '@/components/features/nova-cita-button'

export const metadata = { title: 'Agenda — Tràmit Economistes' }

export default async function WorkerAgendaPage() {
  const supabase = createClient()
  const now = new Date()
  const { data: { user } } = await supabase.auth.getUser()

  const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()

  const { data: absences } = await supabase
    .from('absence_requests')
    .select('*, profiles!absence_requests_user_id_fkey(full_name, color)')
    .eq('status', 'approved')
    .gte('end_date', startOfMonth.split('T')[0])
    .lte('start_date', endOfMonth.split('T')[0])

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, color, role')
    .eq('active', true)
    .order('full_name')

  const { data: holidays } = await supabase
    .from('holidays')
    .select('date, name')
    .eq('year', now.getFullYear())

  const { data: closures } = await supabase
    .from('company_closures')
    .select('date, name')
    .eq('year', now.getFullYear())

  const { data: fiscalDeadlines } = await supabase
    .from('fiscal_deadlines')
    .select('*')
    .gte('date', now.toISOString().split('T')[0])
    .lte('date', new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().split('T')[0])
    .order('date', { ascending: true })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-muted-foreground mt-1">Calendari de l&apos;equip</p>
        </div>
        <NovaCitaButton
          profiles={profiles || []}
          currentUserId={user!.id}
          currentUserRole="worker"
        />
      </div>
      <AgendaClient
        absences={absences || []}
        profiles={profiles || []}
        holidays={holidays || []}
        closures={closures || []}
        currentUserId={user!.id}
        currentUserRole="worker"
        fiscalDeadlines={fiscalDeadlines || []}
      />
    </div>
  )
}
