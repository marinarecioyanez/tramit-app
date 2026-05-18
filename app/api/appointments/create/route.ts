import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail, emailCitaNova } from '@/lib/resend'

export async function POST(request: Request) {
  const supabase = createClient()
  const serviceSupabase = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticat' }, { status: 401 })

  const { data: creatorProfile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  const isAdmin = creatorProfile?.role === 'admin' || creatorProfile?.role === 'supervisor'

  try {
    const body = await request.json()
    const {
      main_attendee_id,
      client_id,
      start_time,
      end_time,
      topic,
      channel,
      priority,
      location,
      internal_notes,
      extra_attendees = [],
    } = body

    const isOwnAppointment = main_attendee_id === user.id
    const status = isAdmin || isOwnAppointment ? 'confirmed' : 'pending'

    // 1. Crear la cita
    const { data: appointment, error: insertError } = await supabase
      .from('appointments')
      .insert({
        created_by: user.id,
        main_attendee_id,
        client_id: client_id || null,
        start_time,
        end_time,
        topic,
        channel,
        priority: priority || 'normal',
        location: location || null,
        internal_notes: internal_notes || null,
        status,
        send_email_to_client: false,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // 2. Inserir assistent principal
    await supabase.from('appointment_attendees').insert({
      appointment_id: appointment.id,
      user_id: main_attendee_id,
      is_main: true,
      status: status === 'confirmed' ? 'accepted' : 'pending',
    })

    // 3. Inserir assistents addicionals
    for (const attendeeId of extra_attendees) {
      await supabase.from('appointment_attendees').insert({
        appointment_id: appointment.id,
        user_id: attendeeId,
        is_main: false,
        status: 'pending',
      })
    }

    // 4. Obtenir dades per als emails
    const allAttendeeIds = [main_attendee_id, ...extra_attendees].filter(id => id !== user.id)
    if (allAttendeeIds.length > 0) {
      const { data: attendeeProfiles } = await serviceSupabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', allAttendeeIds)

      const startDate = new Date(start_time)
      const endDate = new Date(end_time)
      const dateStr = startDate.toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      const startTimeStr = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`
      const endTimeStr = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
      const dashboardUrl = `${process.env.NEXTAUTH_URL || 'https://tramit-app.vercel.app'}/dashboard/agenda`

      // 5. Enviar email a cada assistent
      for (const profile of attendeeProfiles || []) {
        if (!profile.email) continue

        // Notificació interna
        await supabase.from('notifications').insert({
          user_id: profile.id,
          title: status === 'confirmed' ? 'Nova cita programada' : 'Nova sol·licitud de cita',
          body: `${status === 'confirmed' ? 'Tens una cita' : 'Has rebut una sol·licitud'} el ${dateStr} a les ${startTimeStr}.`,
          type: 'appointment',
          read: false,
        })

        // Email
        await sendEmail(emailCitaNova({
          attendeeName: profile.full_name,
          attendeeEmail: profile.email,
          creatorName: creatorProfile?.full_name || 'Un company',
          date: dateStr,
          startTime: startTimeStr,
          endTime: endTimeStr,
          topic,
          channel,
          location: location || null,
          isConfirmed: status === 'confirmed',
          dashboardUrl,
        }))
      }
    }

    return NextResponse.json({ success: true, appointmentId: appointment.id })
  } catch (error) {
    console.error('[Appointments] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconegut' },
      { status: 500 }
    )
  }
}
