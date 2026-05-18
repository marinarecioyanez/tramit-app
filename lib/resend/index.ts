export interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

const DEFAULT_FROM = 'Tràmit Economistes <noreply@tramiteconomistes.com>'

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Resend] API key no configurada. Email no enviat:', payload.subject)
    return
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: payload.from || DEFAULT_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[Resend] Error enviant email:', error)
  }
}

function baseTemplate(content: string): string {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: #1A5F8A; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px; letter-spacing: 2px;">TRÀMIT</h1>
        <p style="color: #E8F4FB; margin: 4px 0 0; font-size: 13px;">economistes</p>
      </div>
      <div style="padding: 32px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        ${content}
      </div>
      <p style="text-align: center; font-size: 11px; color: #9ca3af; margin-top: 16px;">
        Tràmit Economistes · Ús intern i confidencial
      </p>
    </div>
  `
}

export function emailVacancesNova(params: {
  workerName: string
  startDate: string
  endDate: string
  workingDays: number
  dashboardUrl: string
}): EmailPayload {
  return {
    to: ['marina@tramiteconomistes.com', 'rosa@tramiteconomistes.com'],
    subject: `Sol·licitud de vacances — ${params.workerName}`,
    html: baseTemplate(`
      <h2 style="color: #1A5F8A; margin-top: 0;">Nova sol·licitud de vacances</h2>
      <p><strong>${params.workerName}</strong> ha sol·licitat vacances:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 40%;">Del</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${params.startDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Al</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${params.endDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px; color: #6b7280;">Dies laborables</td>
          <td style="padding: 8px; font-weight: 600; color: #2272A3;">${params.workingDays}</td>
        </tr>
      </table>
      <a href="${params.dashboardUrl}" style="display: inline-block; background: #2272A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 8px;">
        Revisar sol·licitud →
      </a>
    `),
  }
}

export function emailVacancesDecisio(params: {
  workerEmail: string
  workerName: string
  approved: boolean
  startDate: string
  endDate: string
  workingDays: number
  adminNote?: string | null
}): EmailPayload {
  const color = params.approved ? '#16a34a' : '#dc2626'
  const statusText = params.approved ? 'aprovades ✓' : 'rebutjades ✗'
  const statusBg = params.approved ? '#f0fdf4' : '#fef2f2'

  return {
    to: params.workerEmail,
    subject: `Les teves vacances han estat ${statusText}`,
    html: baseTemplate(`
      <div style="background: ${statusBg}; border-left: 4px solid ${color}; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <h2 style="color: ${color}; margin: 0;">Vacances ${statusText}</h2>
      </div>
      <p>Hola, <strong>${params.workerName}</strong>.</p>
      <p>La teva sol·licitud de vacances ha estat <strong style="color: ${color};">${statusText}</strong>.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 40%;">Del</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${params.startDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Al</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${params.endDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px; color: #6b7280;">Dies laborables</td>
          <td style="padding: 8px; font-weight: 600;">${params.workingDays}</td>
        </tr>
      </table>
      ${params.adminNote ? `<p style="color: #6b7280; font-style: italic;">Nota: ${params.adminNote}</p>` : ''}
    `),
  }
}

export function emailBenvinguda(params: {
  workerEmail: string
  workerName: string
  password: string
  appUrl: string
}): EmailPayload {
  return {
    to: params.workerEmail,
    subject: 'Benvingut/da a Tràmit Economistes',
    html: baseTemplate(`
      <h2 style="color: #1A5F8A; margin-top: 0;">Benvingut/da, ${params.workerName}!</h2>
      <p>T'han creat un compte a l'aplicació interna de Tràmit Economistes.</p>
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">LES TEVES CREDENCIALS</p>
        <p style="margin: 4px 0;"><strong>Email:</strong> ${params.workerEmail}</p>
        <p style="margin: 4px 0;"><strong>Contrasenya temporal:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${params.password}</code></p>
      </div>
      <p style="color: #dc2626; font-size: 13px;">⚠️ Canvia la contrasenya la primera vegada que entris, des de "El meu perfil".</p>
      <a href="${params.appUrl}" style="display: inline-block; background: #2272A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 8px;">
        Accedir a l'app →
      </a>
    `),
  }
}

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
        Veure a l'app →
      </a>
    `),
  }
}
