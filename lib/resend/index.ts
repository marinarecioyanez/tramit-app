/**
 * Resend email integration
 * Fase 10 — notificacions i recordatoris
 */

export interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
}

const DEFAULT_FROM = 'Tràmit Economistes <noreply@tramiteconomistes.com>'

// Fase 10: implementar enviament real amb Resend SDK
export async function sendEmail(payload: EmailPayload): Promise<{ id: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Resend] RESEND_API_KEY no configurada. Email no enviat:', payload.subject)
    return { id: 'mock-id' }
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
      reply_to: payload.replyTo,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Resend error: ${error}`)
  }

  return response.json()
}

/**
 * Email de nova sol·licitud de vacances per a les admins
 */
export function buildVacationRequestEmail(params: {
  workerName: string
  startDate: string
  endDate: string
  workingDays: number
  dashboardUrl: string
}): EmailPayload {
  return {
    to: ['marina@tramiteconomistes.com', 'rosa@tramiteconomistes.com'],
    subject: `Nova sol·licitud de vacances — ${params.workerName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1A5F8A; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">TRÀMIT</h1>
          <p style="color: #E8F4FB; margin: 4px 0 0; font-size: 14px;">economistes</p>
        </div>
        <div style="padding: 24px; background: #f9f9f9;">
          <h2 style="color: #1A5F8A;">Nova sol·licitud de vacances</h2>
          <p><strong>${params.workerName}</strong> ha sol·licitat vacances:</p>
          <ul>
            <li><strong>Del:</strong> ${params.startDate}</li>
            <li><strong>Al:</strong> ${params.endDate}</li>
            <li><strong>Dies laborables:</strong> ${params.workingDays}</li>
          </ul>
          <a href="${params.dashboardUrl}" 
             style="display: inline-block; background: #2272A3; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; margin-top: 16px;">
            Revisar sol·licitud
          </a>
        </div>
        <div style="padding: 16px; text-align: center; font-size: 12px; color: #666;">
          Tràmit Economistes — Ús intern i confidencial
        </div>
      </div>
    `,
  }
}

/**
 * Email de resolució de vacances per al treballador
 */
export function buildVacationResolutionEmail(params: {
  workerEmail: string
  workerName: string
  approved: boolean
  startDate: string
  endDate: string
  workingDays: number
  adminNote?: string
}): EmailPayload {
  const statusText = params.approved ? 'aprovades ✓' : 'rebutjades ✗'
  const statusColor = params.approved ? '#16a34a' : '#dc2626'

  return {
    to: params.workerEmail,
    subject: `Les teves vacances han estat ${statusText}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1A5F8A; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">TRÀMIT</h1>
          <p style="color: #E8F4FB; margin: 4px 0 0; font-size: 14px;">economistes</p>
        </div>
        <div style="padding: 24px; background: #f9f9f9;">
          <h2 style="color: ${statusColor};">
            Vacances ${statusText}
          </h2>
          <p>Hola, <strong>${params.workerName}</strong>.</p>
          <p>La teva sol·licitud de vacances ha estat <strong>${statusText}</strong>.</p>
          <ul>
            <li><strong>Del:</strong> ${params.startDate}</li>
            <li><strong>Al:</strong> ${params.endDate}</li>
            <li><strong>Dies laborables:</strong> ${params.workingDays}</li>
          </ul>
          ${params.adminNote ? `<p><strong>Nota:</strong> ${params.adminNote}</p>` : ''}
        </div>
        <div style="padding: 16px; text-align: center; font-size: 12px; color: #666;">
          Tràmit Economistes — Ús intern i confidencial
        </div>
      </div>
    `,
  }
}
