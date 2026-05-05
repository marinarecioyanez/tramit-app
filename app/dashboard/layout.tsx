import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      redirect('/login')
    }

    if (profile.role === 'worker') {
      redirect('/worker')
    }

    return (
      <AppLayout profile={profile}>
        {children}
      </AppLayout>
    )
  } catch (error) {
    console.error('Dashboard layout error:', error)
    redirect('/login')
  }
}
