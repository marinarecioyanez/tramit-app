/**
 * Google Calendar API integration
 * Fase 9 — sincronització completa
 * Per ara: estructures i funcions preparades
 */

export interface CalendarEvent {
  id?: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  attendees?: { email: string; displayName?: string }[]
  location?: string
  conferenceData?: unknown
  status?: 'confirmed' | 'tentative' | 'cancelled'
}

// Fase 9: implementar autenticació OAuth2 amb Google
export async function createCalendarEvent(_event: CalendarEvent): Promise<string> {
  // TODO Fase 9: implementar amb Google Calendar API v3
  throw new Error('Google Calendar no implementat fins a Fase 9')
}

export async function updateCalendarEvent(_eventId: string, _event: CalendarEvent): Promise<void> {
  // TODO Fase 9
  throw new Error('Google Calendar no implementat fins a Fase 9')
}

export async function deleteCalendarEvent(_eventId: string): Promise<void> {
  // TODO Fase 9
  throw new Error('Google Calendar no implementat fins a Fase 9')
}

export async function listCalendarEvents(_calendarId: string, _timeMin: string, _timeMax: string): Promise<CalendarEvent[]> {
  // TODO Fase 9
  return []
}
