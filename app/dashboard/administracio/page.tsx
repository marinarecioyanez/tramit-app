export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { AdminClient } from '@/components/features/admin-client'
import { SettingsClient } from '@/components/features/settings-client'

export const metadata = { title: 'Administració — Tràmit Economistes' }

export default async function AdministracioPage() {
  const supabase = createClient()
  const currentYear = new Date().getFullYear()

  const [
    { data: profiles },
    { data: settings },
    { data: holidays },
    { data: closures },
    { data: auditLogs },
    { data: accessLogs },
  ] = await Promise.all([
    supabase.from('profiles').select('*').order('full_name'),
    supabase.from('settings').select('*').order('category'),
    supabase.from('holidays').select('*').order('date'),
    supabase.from('company_closures').select('*').order('date'),
    supabase
      .from('audit_logs')
      .select('*, profiles!audit_logs_user_id_fkey(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('access_logs')
      .select('*, profiles!access_logs_user_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  return (
    <div className="space-y-8">
      <AdminClient
        profiles={profiles || []}
        settings={settings || []}
        holidays={holidays || []}
        closures={closures || []}
        auditLogs={auditLogs || []}
        accessLogs={accessLogs || []}
        currentYear={currentYear}
      />

      {/* Secció Calendari — festius i tancaments */}
      <div className="border-t pt-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold">Calendari laboral</h2>
          <p className="text-muted-foreground mt-1">
            Gestiona els festius i els tancaments d&apos;empresa per any
          </p>
        </div>
        <SettingsClient
          settings={settings || []}
          holidays={holidays || []}
          closures={closures || []}
        />
      </div>
    </div>
  )
}
