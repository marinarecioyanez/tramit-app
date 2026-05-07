export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { AdminClient } from '@/components/features/admin-client'

export const metadata = { title: 'Administració — Tràmit Economistes' }

export default async function AdministracioPage() {
  const supabase = createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name')

  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .order('category')

  const { data: holidays } = await supabase
    .from('holidays')
    .select('*')
    .order('date')

  const { data: closures } = await supabase
    .from('company_closures')
    .select('*')
    .order('date')

  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*, profiles!audit_logs_user_id_fkey(full_name)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <AdminClient
      profiles={profiles || []}
      settings={settings || []}
      holidays={holidays || []}
      closures={closures || []}
      auditLogs={auditLogs || []}
    />
  )
}
