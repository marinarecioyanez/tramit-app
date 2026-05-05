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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/login')
  }

  if (!profile.active) {
    redirect('/login?error=account-disabled')
  }

  // Admins should use /dashboard
  if (profile.role === 'admin') {
    redirect('/dashboard')
  }

  return (
    <AppLayout profile={profile as Profile}>
      {children}
    </AppLayout>
  )
}
