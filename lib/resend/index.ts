export function emailCitaNova(params: {
  attendeeName: string
  attendeeEmail: string
  creatorName: string
  date: string
  startTime: string
  endTime: string
  topic: string
  channel: string
  location: string | null
  isConfirmed: boolean
  dashboardUrl: string
}): EmailPayload {
  const topicLabels: Record<string, string> = {
    fiscal: 'Fiscal', labor: 'Laboral', accounting: 'Comptable',
    income_tax: 'Renda', freelance: 'Autònoms', companies: 'Societats',
    internal_meeting: 'Reunió interna', client_query: 'Consulta client',
    documentation: 'Documentació', other: 'Altre',
  }
  const channelLabels: Record<string, string> = {
    in_person: 'Presencial', phone: 'Telèfon',
    video: 'Videotrucada', email: 'Email', other: 'Altre',
  }

  return {
    to: params.attendeeEmail,
    subject: params.isConfirmed
      ? `Cita confirmada — ${params.date} a les ${params.startTime}`
      : `Sol·licitud de cita — ${params.date} a les ${params.startTime}`,
    html: baseTemplate(`
      <h2 style="color: #1A5F8A; margin-top: 0;">
        ${params.isConfirmed ? '✅ Cita confirmada' : '📅 Nova sol·licitud de cita'}
      </h2>
      <p>Hola <strong>${params.attendeeName}</strong>,</p>
      <p>${params.isConfirmed
        ? `<strong>${params.creatorName}</strong> ha programat una cita:`
        : `<strong>${params.creatorName}</strong> t'ha enviat una sol·licitud de cita:`
      }</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 40%;">Data</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${params.date}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Hora</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${params.startTime} — ${params.endTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Tema</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${topicLabels[params.topic] || params.topic}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Canal</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${channelLabels[params.channel] || params.channel}</td>
        </tr>
        ${params.location ? `
        <tr>
          <td style="padding: 8px; color: #6b7280;">Lloc</td>
          <td style="padding: 8px;">${params.location}</td>
        </tr>` : ''}
      </table>
      ${!params.isConfirmed ? `
      <p style="color: #6b7280; font-size: 14px;">
        Accedeix a l'aplicació per acceptar, rebutjar o proposar una altra hora.
      </p>` : ''}
      <a href="${params.dashboardUrl}" style="display: inline-block; background: #2272A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 8px;">
        Veure a l'app
      </a>
    `),
  }
}
