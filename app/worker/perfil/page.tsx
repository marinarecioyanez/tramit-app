export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { PerfilWorkerClient } from '@/components/features/perfil-worker-client'

export const metadata = { title: 'El meu perfil — Tràmit Economistes' }

export default async function PerfilPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  return <PerfilWorkerClient profile={profile} />
}
