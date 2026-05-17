'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Umbrella, ClipboardList, X, Clock, User, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NovaCitaButton } from './nova-cita-button'

interface Absence {
  id: string
  user_id: string
  type: string
  start_date: string
  end_date: string
  status: string
  profiles?: { full_name: string; color: string | null } | null
}

interface Appointment {
  id: string
  start_time: string
  end_time: string
  topic: string
  channel: string
  status: string
  priority: string
  location: string | null
  internal_notes: string | null
  main_attendee_id: string
  profiles?: { full_name: string; color: string | null } | null
  clients?: { name: string } | null
  appointment_attendees?: {
    user_id: string
    is_main: boolean
    status: string
    profiles?: { full_name: string; color: string | null } | null
  }[]
}

interface Profile {
  id: string
  full_name: string
  color: string | null
  role: string
}

interface Holiday { date: string; name: string }
interface Closure { date: string; name: string }
interface FiscalDeadline {
  id: string
  date: string
  name: string
  model: string | null
}

const DAYS_CA = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg']
const DAYS_FULL_CA = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge']
const MONTHS_CA = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre']
const HOURS = Array.from({ length: 11 }, (_, i) => i + 7)

const TOPIC_LABELS: Record<string, string> = {
  fiscal: 'Fiscal', labor: 'Laboral', accounting: 'Comptable',
  income_tax: 'Renda', freelance: 'Autònoms', companies: 'Societats',
  internal_meeting: 'Reunió interna', client_query: 'Consulta client',
  documentation: 'Documentació', other: 'Altre',
}

const CHANNEL_LABELS: Record<string, string> = {
  in_person: 'Presencial', phone: 'Telèfon',
  video: 'Videotrucada', email: 'Email', other: 'Altre',
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmada', pending: 'Pendent', cancelled: 'Cancel·lada',
}

type ViewMode = 'mes' | 'setmana' | 'dia'

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(12, 0, 0, 0)
  return d
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function AgendaClient({
  absences,
  profiles,
  holidays,
  closures,
  currentUserId,
  currentUserRole,
  fiscalDeadlines = [],
  appointments = [],
}: {
  absences: Absence[]
  profiles: Profile[]
  holidays: Holiday[]
  closures: Closure[]
  currentUserId: string
  currentUserRole: string
  fiscalDeadlines?: FiscalDeadline[]
  appointments?: Appointment[]
}) {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const todayStr = toLocalDateStr(today)

  const [viewMode, setViewMode] = useState<ViewMode>('mes')
  const [currentDate, setCurrentDate] = useState(new Date(today))
  const [filterUser, setFilterUser] = useState<string>('all')
  const [showFiscal, setShowFiscal] = useState(false)
  const [newCitaDate, setNewCitaDate] = useState<string | null>(null)
  const [newCitaTime, setNewCitaTime] = useState<string | null>(null)
  const [showNovaCita, setShowNovaCita] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  const holidayDates = new Map(holidays.map(h => [h.date, h.name]))
  const closureDates = new Map(closures.map(c => [c.date, c.name]))
  const fiscalDates = new Map(fiscalDeadlines.map(d => [d.date, d]))

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  function isSpecialDay(date: Date) {
    const dateStr = toLocalDateStr(date)
    const holidayName = holidayDates.get(dateStr)
    const closureName = closureDates.get(dateStr)
    return {
      holiday: !!holidayName,
      closure: !!closureName,
      name: holidayName || closureName || null,
    }
  }

  function getAbsencesForDay(date: Date): Absence[] {
    const dateStr = toLocalDateStr(date)
    return absences.filter(abs => {
      if (filterUser !== 'all' && abs.user_id !== filterUser) return false
      return dateStr >= abs.start_date && dateStr <= abs.end_date
    })
  }

  function getAppointmentsForDay(date: Date): Appointment[] {
    const dateStr = toLocalDateStr(date)
    return appointments.filter(apt => {
      if (filterUser !== 'all' && apt.main_attendee_id !== filterUser) return false
      return apt.start_time.startsWith(dateStr)
    })
  }

  function openNovaCita(dateStr: string, time = '09:00') {
    const d = new Date(dateStr + 'T12:00:00')
    if (d.getDay() === 0 || d.getDay() === 6) return
    setNewCitaDate(dateStr)
    setNewCitaTime(time)
    setShowNovaCita(true)
  }

  function openDayDetail(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00')
    setCurrentDate(d)
    setSelectedDay(dateStr)
    setViewMode('dia')
  }

  function navigate(direction: number) {
    if (viewMode === 'mes') {
      setCurrentDate(new Date(year, month + direction, 1, 12))
    } else if (viewMode === 'setmana') {
      const monday = getMondayOfWeek(currentDate)
      monday.setDate(monday.getDate() + direction * 7)
      setCurrentDate(new Date(monday))
    } else {
      const d = new Date(currentDate)
      d.setDate(d.getDate() + direction)
      setCurrentDate(d)
    }
  }

  function goToday() {
    const now = new Date()
    now.setHours(12, 0, 0, 0)
    setCurrentDate(now)
    setSelectedDay(todayStr)
    if (viewMode === 'mes') {
      setCurrentDate(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12))
    }
  }

  function getHeaderTitle(): string {
    if (viewMode === 'mes') return `${MONTHS_CA[month]} ${year}`
    if (viewMode === 'setmana') {
      const monday = getMondayOfWeek(currentDate)
      const sunday = new Date(monday)
      sunday.setDate(sunday.getDate() + 6)
      return `${monday.getDate()} ${MONTHS_CA[monday.getMonth()]} — ${sunday.getDate()} ${MONTHS_CA[sunday.getMonth()]} ${sunday.getFullYear()}`
    }
    return `${currentDate.getDate()} ${MONTHS_CA[curre
