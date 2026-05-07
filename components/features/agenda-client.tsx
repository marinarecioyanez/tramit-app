'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Umbrella, ClipboardList } from 'lucide-react'
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

export function AgendaClient({
  absences,
  profiles,
  holidays,
  closures,
  currentUserId,
  currentUserRole,
  fiscalDeadlines = [],
}: {
  absences: Absence[]
  profiles: Profile[]
  holidays: Holiday[]
  closures: Closure[]
  currentUserId: string
  currentUserRole: string
  fiscalDeadlines?: FiscalDeadline[]
}) {
  const today = new Date()
  today.setHours(12, 0, 0, 0)

  const [viewMode, setViewMode] = useState<ViewMode>('mes')
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1, 12)
  )
  const [filterUser, setFilterUser] = useState<string>('all')
  const [showFiscal, setShowFiscal] = useState(false)
  const [newCitaDate, setNewCitaDate] = useState<string | null>(null)
  const [newCitaTime, setNewCitaTime] = useState<string | null>(null)
  const [showNovaCita, setShowNovaCita] = useState(false)

  const holidayDates = new Map(holidays.map(h => [h.date, h.name]))
  const closureDates = new Map(closures.map(c => [c.date, c.name]))
  const fiscalDates = new Map(fiscalDeadlines.map(d => [d.date, d]))

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const todayStr = toLocalDateStr(today)

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

  function openNovaCita(dateStr: string, time = '09:00') {
    const d = new Date(dateStr + 'T12:00:00')
    if (d.getDay() === 0 || d.getDay() === 6) return
    setNewCitaDate(dateStr)
    setNewCitaTime(time)
    setShowNovaCita(true)
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
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1, 12))
  }

  function getHeaderTitle(): string {
    if (viewMode === 'mes') return `${MONTHS_CA[month]} ${year}`
    if (viewMode === 'setmana') {
      const monday = getMondayOfWeek(currentDate)
      const sunday = new Date(monday)
      sunday.setDate(sunday.getDate() + 6)
      return `${monday.getDate()} ${MONTHS_CA[monday.getMonth()]} — ${sunday.getDate()} ${MONTHS_CA[sunday.getMonth()]} ${sunday.getFullYear()}`
    }
    return `${currentDate.getDate()} ${MONTHS_CA[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  }

  const workers = profiles.filter(p =>
    p.role === 'worker' || p.role === 'admin' || p.role === 'supervisor'
  )

  // ── Vista MES ─────────────────────────────────────────────

  function renderMes() {
    const firstDay = new Date(year, month, 1, 12)
    const lastDay = new Date(year, month + 1, 0, 12)

    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6

    const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7
    const days: (Date | null)[] = []

    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startDow + 1
      if (dayNum < 1 || dayNum > lastDay.getDate()) {
        days.push(null)
      } else {
        days.push(new Date(year, month, dayNum, 12))
      }
    }

    return (
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS_CA.map((day, i) => (
              <div
                key={day}
                className={`py-2 text-center text-xs font-semibold ${
                  i >= 5 ? 'text-muted-foreground/50' : 'text-muted-foreground'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((date, idx) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[80px] border-b border-r border-border bg-muted/20"
                  />
                )
              }

              const dateStr = toLocalDateStr(date)
              const isToday = dateStr === todayStr
              const isWeekend = date.getDay() === 0 || date.getDay() === 6
              const special = isSpecialDay(date)
              const dayAbsences = getAbsencesForDay(date)
              const fiscal = fiscalDates.get(dateStr)

              return (
                <div
                  key={dateStr}
                  onClick={() => openNovaCita(dateStr)}
                  className={`min-h-[80px] border-b border-r border-border p-1 transition-colors
                    ${isWeekend ? 'bg-muted/30 cursor-default' : 'cursor-pointer hover:bg-tramit-blue-light/30 dark:hover:bg-blue-900/10'}
                    ${special.holiday || special.closure ? 'bg-amber-50 dark:bg-amber-900/10' : ''}
                  `}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-tramit-blue text-white'
                          : isWeekend
                          ? 'text-muted-foreground/50'
                          : 'text-foreground'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {fiscal && showFiscal && (
                      <span
                        title={`${fiscal.name}${fiscal.model ? ` · M.${fiscal.model}` : ''}`}
                        className="text-[8px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1 rounded"
                      >
                        {fiscal.model ? `M${fiscal.model}` : '📋'}
                      </span>
                    )}
                  </div>

                  {special.name && (
                    <div
                      className="text-[9px] text-amber-700 dark:text-amber-400 leading-tight mb-0.5 truncate"
                      title={special.name}
                    >
                      {special.name}
                    </div>
                  )}

                  <div className="space-y-0.5">
                    {dayAbsences.slice(0, 3).map(abs => {
                      const profile = abs.profiles as { full_name: string; color: string | null } | null
                      const color = profile?.color || '#2272A3'
                      const name = profile?.full_name || '—'
                      return (
                        <div
                          key={abs.id}
                          className="flex items-center gap-1 rounded px-1 py-0.5"
                          style={{
                            backgroundColor: color + '25',
                            borderLeft: `2px solid ${color}`,
                          }}
                          title={`${name} — ${abs.type === 'vacation' ? 'Vacances' : 'Absència'}`}
                        >
                          <div
                            className="h-3.5 w-3.5 rounded-full flex items-center justify-center text-white shrink-0"
                            style={{
                              backgroundColor: color,
                              fontSize: '7px',
                              fontWeight: 700,
                            }}
                          >
                            {getInitials(name)}
                          </div>
                          <span
                            className="text-[9px] truncate font-medium"
                            style={{ color }}
                          >
                            {name.split(' ')[0]}
                          </span>
                        </div>
                      )
                    })}
                    {dayAbsences.length > 3 && (
                      <div className="text-[9px] text-muted-foreground pl-1">
                        +{dayAbsences.length - 3} més
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Vista SETMANA ─────────────────────────────────────────

  function renderSetmana() {
    const monday = getMondayOfWeek(currentDate)
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(d.getDate() + i)
      d.setHours(12, 0, 0, 0)
      return d
    })

    return (
      <Card>
        <CardContent className="p-0 overflow-auto">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-8 border-b border-border">
              <div className="py-2 px-2 text-xs text-muted-foreground" />
              {weekDays.map(d => {
                const dateStr = toLocalDateStr(d)
                const isToday = dateStr === todayStr
                const isWeekend = d.getDay() === 0 || d.getDay() === 6
                const special = isSpecialDay(d)
                const fiscal = fiscalDates.get(dateStr)
                return (
                  <div
                    key={dateStr}
                    className={`py-2 text-center border-l border-border ${
                      isWeekend ? 'bg-muted/30' : ''
                    } ${special.holiday || special.closure ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}
                  >
                    <p className={`text-xs font-medium ${isWeekend ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                      {DAYS_FULL_CA[d.getDay() === 0 ? 6 : d.getDay() - 1]}
                    </p>
                    <p className={`text-sm font-bold mt-0.5 mx-auto w-7 h-7 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-tramit-blue text-white' : ''
                    }`}>
                      {d.getDate()}
                    </p>
                    {special.name && (
                      <p className="text-[9px] text-amber-600 truncate px-1">{special.name}</p>
                    )}
                    {fiscal && showFiscal && (
                      <p className="text-[9px] text-amber-600 font-bold truncate px-1">
                        {fiscal.model ? `M.${fiscal.model}` : '📋'}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-8 border-b border-border bg-muted/10">
              <div className="px-2 py-2 text-xs text-muted-foreground self-center">Tot el dia</div>
              {weekDays.map(d => {
                const dateStr = toLocalDateStr(d)
                const dayAbsences = getAbsencesForDay(d)
                return (
                  <div key={dateStr} className="border-l border-border p-1 min-h-[40px]">
                    {dayAbsences.map(abs => {
                      const profile = abs.profiles as { full_name: string; color: string | null } | null
                      const color = profile?.color || '#2272A3'
                      const name = profile?.full_name || '—'
                      return (
                        <div
                          key={abs.id}
                          className="flex items-center gap-1 rounded px-1 py-0.5 mb-0.5"
                          style={{ backgroundColor: color + '25', borderLeft: `2px solid ${color}` }}
                        >
                          <span className="text-[9px] font-medium truncate" style={{ color }}>
                            {name.split(' ')[0]}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {HOURS.map(hour => (
              <div key={hour} className="grid grid-cols-8 border-b border-border">
                <div className="px-2 py-2 text-xs text-muted-foreground text-right">{hour}:00</div>
                {weekDays.map(d => {
                  const dateStr = toLocalDateStr(d)
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6
                  return (
                    <div
                      key={dateStr + hour}
                      onClick={() => !isWeekend && openNovaCita(dateStr, `${String(hour).padStart(2, '0')}:00`)}
                      className={`border-l border-border min-h-[40px] transition-colors ${
                        isWeekend
                          ? 'bg-muted/20 cursor-default'
                          : 'cursor-pointer hover:bg-tramit-blue-light/30 dark:hover:bg-blue-900/10'
                      }`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Vista DIA ─────────────────────────────────────────────

  function renderDia() {
    const dateStr = toLocalDateStr(currentDate)
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6
    const special = isSpecialDay(currentDate)
    const dayAbsences = getAbsencesForDay(currentDate)
    const isToday = dateStr === todayStr
    const fiscal = fiscalDates.get(dateStr)

    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div
                className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold ${
                  isToday ? 'bg-tramit-blue' : 'bg-muted-foreground'
                }`}
              >
                {currentDate.getDate()}
              </div>
              <div>
                <p className="font-semibold text-lg">
                  {DAYS_FULL_CA[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1]},{' '}
                  {currentDate.getDate()} {MONTHS_CA[currentDate.getMonth()]} {currentDate.getFullYear()}
                </p>
                {special.name && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">🎌 {special.name}</p>
                )}
                {fiscal && showFiscal && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    📋 {fiscal.name}{fiscal.model ? ` · Model ${fiscal.model}` : ''}
                  </p>
                )}
                {isWeekend && <p className="text-sm text-muted-foreground">Cap de setmana</p>}
              </div>
              {dayAbsences.length > 0 && (
                <div className="ml-auto flex gap-2 flex-wrap">
                  {dayAbsences.map(abs => {
                    const profile = abs.profiles as { full_name: string; color: string | null } | null
                    const color = profile?.color || '#2272A3'
                    return (
                      <div
                        key={abs.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                        style={{ backgroundColor: color + '20', color }}
                      >
                        <div
                          className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: color }}
                        >
                          {getInitials(profile?.full_name || '?')}
                        </div>
                        {profile?.full_name?.split(' ')[0]}
                        {abs.type === 'vacation' ? ' · Vacances' : ' · Absència'}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {HOURS.map(hour => (
                <div
                  key={hour}
                  onClick={() => !isWeekend && !special.holiday && !special.closure &&
                    openNovaCita(dateStr, `${String(hour).padStart(2, '0')}:00`)
                  }
                  className={`flex items-stretch min-h-[48px] transition-colors ${
                    isWeekend || special.holiday || special.closure
                      ? 'bg-muted/20 cursor-default'
                      : 'cursor-pointer hover:bg-tramit-blue-light/30 dark:hover:bg-blue-900/10'
                  }`}
                >
                  <div className="w-16 px-3 py-3 text-xs text-muted-foreground text-right shrink-0 border-r border-border">
                    {hour}:00
                  </div>
                  <div className="flex-1 px-3 py-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Resum del mes ─────────────────────────────────────────

  function renderResumMes() {
    const monthAbsences = absences.filter(abs => {
      const start = new Date(abs.start_date + 'T12:00:00')
      const end = new Date(abs.end_date + 'T12:00:00')
      const monthStart = new Date(year, month, 1, 12)
      const monthEnd = new Date(year, month + 1, 0, 12)
      if (filterUser !== 'all' && abs.user_id !== filterUser) return false
      return start <= monthEnd && end >= monthStart
    })

    if (monthAbsences.length === 0) return null

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Absències del mes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {monthAbsences.map(abs => {
              const profile = abs.profiles as { full_name: string; color: string | null } | null
              const color = profile?.color || '#2272A3'
              return (
                <div key={abs.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {getInitials(profile?.full_name || '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{profile?.full_name || '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {abs.start_date} → {abs.end_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {abs.type === 'vacation'
                      ? <Umbrella className="h-3.5 w-3.5 text-tramit-blue" />
                      : <ClipboardList className="h-3.5 w-3.5 text-slate-500" />
                    }
                    <span className="text-xs text-muted-foreground">
                      {abs.type === 'vacation' ? 'Vacances' : 'Absència'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── RENDER PRINCIPAL ──────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-base font-semibold min-w-[200px] text-center">
            {getHeaderTitle()}
          </h2>
          <button
            onClick={() => navigate(1)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={goToday}
            className="ml-1 px-3 py-1.5 rounded-lg bg-muted text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            Avui
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode vista */}
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            {(['mes', 'setmana', 'dia'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === mode
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Filtre treballador */}
          <select
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">Tots</option>
            {workers.map(p => (
              <option key={p.id} value={p.id}>{p.full_name.split(' ')[0]}</option>
            ))}
          </select>

          {/* Botó terminis fiscals */}
          {fiscalDeadlines.length > 0 && (
            <button
              onClick={() => setShowFiscal(!showFiscal)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                showFiscal
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              📋 {showFiscal ? 'Amagar terminis' : 'Terminis fiscals'}
            </button>
          )}
        </div>
      </div>

      {/* Llegenda */}
      <div className="flex gap-3 flex-wrap items-center">
        {workers.map(p => (
          <div key={p.id} className="flex items-center gap-1.5">
            <div
              className="h-5 w-5 rounded-full flex items-center justify-center text-white"
              style={{
                backgroundColor: p.color || '#2272A3',
                fontSize: '9px',
                fontWeight: 700,
              }}
            >
              {getInitials(p.full_name)}
            </div>
            <span className="text-xs text-muted-foreground">{p.full_name.split(' ')[0]}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded bg-amber-100 dark:bg-amber-900/30 border border-amber-300" />
          <span className="text-xs text-muted-foreground">Festiu / Tancament</span>
        </div>
        <div className="ml-auto text-xs text-muted-foreground italic hidden sm:block">
          Clica per crear una cita
        </div>
      </div>

      {/* Panell terminis fiscals */}
      {showFiscal && fiscalDeadlines.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-3">
            Propers terminis fiscals
          </p>
          <div className="space-y-2">
            {fiscalDeadlines.map(d => {
              const daysLeft = Math.ceil(
                (new Date(d.date + 'T00:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              )
              const isUrgent = daysLeft <= 7
              return (
                <div key={d.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{d.name}</p>
                    {d.model && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                        M.{d.model}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">
                      {new Date(d.date + 'T00:00:00').toLocaleDateString('ca-ES', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                    <p className={`text-[10px] ${isUrgent ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                      {daysLeft === 0 ? 'Avui!' : daysLeft === 1 ? 'Demà' : `${daysLeft} dies`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Contingut */}
      {viewMode === 'mes' && renderMes()}
      {viewMode === 'setmana' && renderSetmana()}
      {viewMode === 'dia' && renderDia()}
      {viewMode === 'mes' && renderResumMes()}

      {/* Modal nova cita */}
      {showNovaCita && newCitaDate && (
        <NovaCitaButton
          profiles={profiles}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          initialDate={newCitaDate}
          initialTime={newCitaTime || '09:00'}
          forceOpen={true}
          onClose={() => {
            setShowNovaCita(false)
            setNewCitaDate(null)
            setNewCitaTime(null)
          }}
        />
      )}
    </div>
  )
}
