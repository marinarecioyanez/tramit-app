export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import type { Profile } from '@/types'

export default async function WorkerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role === 'admin' || profile.role === 'supervisor') redirect('/dashboard')

  const typedProfile: Profile = {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: profile.role,
    phone: profile.phone ?? null,
    language: profile.language ?? 'ca',
    telegram_chat_id: profile.telegram_chat_id ?? null,
    active: profile.active ?? true,
    avatar_url: profile.avatar_url ?? null,
    color: profile.color ?? null,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  }

  return (
    <AppLayout profile={typedProfile}>
      {children}
    </AppLayout>
  )
}
