import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/utils/auth-guard'
import { sendEmail, emailVacancesDecisio } from '@/lib/resend'

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { requestId, action, adminNote } = await request.json()

    if (!requestId || !action) {
      return NextResponse.json({ error: 'Falten camps' }, { status: 400 })
    }

    const supabase = createClient()

    // Obtenir la sol·licitud amb dades del treballador
    const { data: absenceRequest, error: fetchError } = await supabase
      .from('absence_requests')
      .select('*, profiles!absence_requests_user_id_fkey(full_name, email)')
      .eq('id', requestId)
      .single()

    if (fetchError || !absenceRequest) {
      return NextResponse.json({ error: 'Sol·licitud no trobada' }, { status: 404 })
    }

    // Actualitzar estat
    const { error: updateError } = await supabase
      .from('absence_requests')
      .update({
        status: action,
        admin_note: adminNote || null,
        approved_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (updateError) throw updateError

    // Actualitzar saldo si s'aprova
    if (action === 'approved') {
      const { data: balance } = await supabase
        .from('vacation_balances')
        .select('used_days, pending_days')
        .eq('user_id', absenceRequest.user_id)
        .eq('year', new Date().getFullYear())
        .single()

      if (balance) {
        await supabase
          .from('vacation_balances')
          .update({
            used_days: (balance.used_days || 0) + absenceRequest.working_days,
            pending_days: Math.max(0, (balance.pending_days || 0) - absenceRequest.working_days),
          })
          .eq('user_id', absenceRequest.user_id)
          .eq('year', new Date().getFullYear())
      }
    }

    // Enviar email al treballador
    const profile = Array.isArray(absenceRequest.profiles)
      ? absenceRequest.profiles[0]
      : absenceRequest.profiles

    if (profile?.email && absenceRequest.type === 'vacation') {
      await sendEmail(emailVacancesDecisio({
        workerEmail: profile.email,
        workerName: profile.full_name,
        approved: action === 'approved',
        startDate: absenceRequest.start_date,
        endDate: absenceRequest.end_date,
        workingDays: absenceRequest.working_days,
        adminNote: adminNote || null,
      }))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconegut' },
      { status: 500 }
    )
  }
}
