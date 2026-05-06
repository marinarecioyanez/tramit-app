import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { email, password, full_name, phone, role, color } = await request.json()

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Falten camps obligatoris' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Crear usuari a Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Actualitzar perfil amb dades addicionals
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name,
        role,
        phone: phone || null,
        color: color || '#2272A3',
        active: true,
      })
      .eq('id', authData.user.id)

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, userId: authData.user.id })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconegut' },
      { status: 500 }
    )
  }
}
