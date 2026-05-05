import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from '@/components/features/login-form'

export default async function LoginPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Already logged in, redirect to root which handles routing
    redirect('/')
  }

  return <LoginForm />
}
