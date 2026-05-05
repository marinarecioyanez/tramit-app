'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from './sidebar'
import { Header } from './header'

interface AppLayoutProps {
  children: React.ReactNode
  profile: {
    id: string
    email: string
    full_name: string
    role: 'admin' | 'supervisor' | 'worker'
    phone?: string | null
    language?: string
    telegram_chat_id?: string | null
    active?: boolean
    avatar_url?: string | null
    created_at?: string
    updated_at?: string
  }
}

export function AppLayout({ children, profile }: AppLayoutProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar profile={profile} onSignOut={handleSignOut} />
      <Header />
      <main className="ml-[220px] mt-14 p-6 min-h-[calc(100vh-3.5rem)]">
        {children}
      </main>
    </div>
  )
}
