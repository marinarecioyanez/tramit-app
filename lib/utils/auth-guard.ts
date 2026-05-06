import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function requireAdmin(): Promise<{ error: NextResponse } | { userId: string }> {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: NextResponse.json({ error: 'No autenticat' }, { status: 401 })
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return {
      error: NextResponse.json({ error: 'Accés denegat' }, { status: 403 })
    }
  }

  return { userId: user.id }
}
