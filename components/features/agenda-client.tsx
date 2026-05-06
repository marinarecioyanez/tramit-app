'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Umbrella, ClipboardList } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

const DAYS_CA = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg']
const DAYS_FULL_CA = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge']
const MONTHS_CA = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre']
const HOURS = Array.from({ length: 11 }, (_, i) => i + 7) // 7h a 17h

type ViewMode = 'mes' | 'setmana' | 'dia'

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function AgendaClient({ absences, profiles, holidays, closures }: {
  absences: Absence[]
  profiles: Profile[]
  holidays: Holiday[]
  closures: Closure[]
}) {
  const today = new Date()
  const [viewMode, setViewMode] = useState<ViewMode>('mes')
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [filterUser, setFilterUser] = useState<string>('all')

  const holidayDates = new Set(holidays.map(h => h.date))
  const closureDates = new Set(closures.map(c => c.date))

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Helpers
  function getAbsencesForDay(date: Date): Absence[] {
    const dateStr = date.toISOString().split('T')[0]
    return absences.filter(abs => {
      if (filterUser !== 'all' && abs.user_id !== filterUser) return false
      return dateStr >= abs.start_date && dateStr <= abs.end_date
    })
  }

  function isSpecialDay(date: Date): { holiday: boolean; closure: boolean; name: string | null } {
    const dateStr = date.toISOString().split('T')[0]
    const h = holidays.find(h => h.date === dateStr)
    const c = closures.find(c => c.date === dateStr)
    return {
      holiday: !!h,
      closure: !!c,
      name: h?.name || c?.name || null
    }
  }

  function navigate(direction: number) {
    if (viewMode === 'mes') {
      setCurrentDate(new Date(year, month + direction, 1))
    } else if (viewMode === 'setmana') {
      const monday = getMondayOfWeek(currentDate)
      monday.setDate(monday.getDate() + direction * 7)
      setCurrentDate(new Date(monday))
    } else {
      const d = new Date(currentDate)
      d.setDate(d.getDate() + direction)
      setCurrentDate(new Date(d))
      setSelectedDay(new Date(d))
    }
  }

  function goToday() {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDay(new Date(today))
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

  const workers = profiles.filter(p => p.role === 'worker')

  // ===== VISTA MES =====
  function renderMes() {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6
    const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7
    const days: (Date | null)[] = []
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startDow + 1
      if (dayNum < 1 || dayNum > lastDay.getDate()) days.push(null)
      else days.push(new Date(year, month, dayNum))
    }

    return (
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS_CA.map(day => (
              <div key={day} className={`py-2 text-center text-xs font-semibold ${day === 'Ds' || day === 'Dg' ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} className="min-h-[80px] border-b border-r border-border bg-muted/20" />
              const dateStr = date.toISOString().split('T')[0]
              const isToday = dateStr === today.toISOString().split('T')[0]
              const isWeekend = date.getDay() === 0 || date.getDay() === 6
              const special = isSpecialDay(date)
              const dayAbsences = getAbsencesForDay(date)

              return (
                <div
                  key={dateStr}
                  onClick={() => { setSelectedDay(date); setCurrentDate(new Date(date.getFullYear(), date.getMonth(), date.getDate())); setViewMode('dia') }}
                  className={`min-h-[80px] border-b border-r border-border p-1 cursor-pointer transition-colors hover:bg-muted/40 ${isWeekend ? 'bg-muted/30' : ''} ${special.holiday || special.closure ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-tramit-blue text-white' : isWeekend ? 'text-muted-foreground/50' : 'text-foreground'}`}>
                      {date.getDate()}
                    </span>
                  </div>
                  {special.name && (
                    <div className="text-[9px] text-amber-700 dark:text-amber-400 leading-tight mb-1 truncate">{special.name}</div>
                  )}
                  <div className="space-y-0.5">
                    {dayAbsences.slice(0, 3).map(abs => {
                      const profile = abs.profiles as { full_name: string; color: string | null } | null
                      const color = profile?.color || '#2272A3'
                      const name = profile?.full_name || '—'
                      return (
                        <div key={abs.id} className="flex items-center gap-1 rounded px-1 py-0.5" style={{ backgroundColor: color + '25', borderLeft: `2px solid ${color}` }}>
                          <div className="h-3.5 w-3.5 rounded-full flex items-center justify-center text-white shrink-0" style={{ backgroundColor: color, fontSize: '7px', fontWeight: 700 }}>
                            {getInitials(name)}
                          </div>
                          <span className="text-[9px] truncate font-medium" style={{ color }}>{name.split(' ')[0]}</span>
                        </div>
                      )
                    })}
                    {dayAbsences.length > 3 && <div className="text-[9px] text-muted-foreground pl-1">+{dayAbsences.length - 3} més</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  // ===== VISTA SETMANA =====
  function renderSetmana() {
    const monday = getMondayOfWeek(currentDate)
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(d.getDate() + i)
      return d
    })

    return (
      <Card>
        <CardContent className="p-0 overflow-auto">
          <div className="min-w-[600px]">
            {/* Capçalera */}
            <div className="grid grid-cols-8 border-b border-border">
              <div className="py-2 px-2 text-xs text-muted-foreground" />
              {weekDays.map(d => {
                const dateStr = d.toISOString().split('T')[0]
                const isToday = dateStr === today.toISOString().split('T')[0]
                const isWeekend = d.getDay() === 0 || d.getDay() === 6
                const special = isSpecialDay(d)
                return (
                  <div key={dateStr} className={`py-2 text-center border-l border-border ${isWeekend ? 'bg-muted/30' : ''} ${special.holiday || special.closure ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}>
                    <p className={`text-xs font-medium ${isWeekend ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                      {DAYS_FULL_CA[d.getDay() === 0 ? 6 : d.getDay() - 1]}
                    </p>
                    <p className={`text-sm font-bold mt-0.5 mx-auto w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-tramit-blue text-white' : ''}`}>
                      {d.getDate()}
                    </p>
                    {special.name && <p className="text-[9px] text-amber-600 truncate px-1">{special.name}</p>}
                  </div>
                )
              })}
            </div>

            {/* Fila d'absències dia complet */}
            <div className="grid grid-cols-8 border-b border-border bg-muted/10">
              <div className="px-2 py-2 text-xs text-muted-foreground self-center">Tot el dia</div>
              {weekDays.map(d => {
                const dayAbsences = getAbsencesForDay(d)
                return (
                  <div key={d.toISOString()} className="border-l border-border p-1 min-h-[40px]">
                    {dayAbsences.map(abs => {
                      const profile = abs.profiles as { full_name: string; color: string | null } | null
                      const color = profile?.color || '#2272A3'
                      const name = profile?.full_name || '—'
                      return (
                        <div key={abs.id} className="flex items-center gap-1 rounded px-1 py-0.5 mb-0.5" style={{ backgroundColor: color + '25', borderLeft: `2px solid ${color}` }}>
                          <span className="text-[9px] font-medium truncate" style={{ color }}>{name.split(' ')[0]}</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* Hores */}
            {HOURS.map(hour => (
              <div key={hour} className="grid grid-cols-8 border-b border-border hover:bg-muted/10 transition-colors">
                <div className="px-2 py-2 text-xs text-muted-foreground text-right">{hour}:00</div>
                {weekDays.map(d => {
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6
                  return (
                    <div key={d.toISOString() + hour} className={`border-l border-border min-h-[40px] ${isWeekend ? 'bg-muted/20' : ''}`} />
                  )
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // ===== VISTA DIA =====
  function renderDia() {
    const dateStr = currentDate.toISOString().split('T')[0]
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6
    const special = isSpecialDay(currentDate)
    const dayAbsences = getAbsencesForDay(currentDate)

    return (
      <div className="space-y-4">
        {/* Info del dia */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold ${dateStr === today.toISOString().split('T')[0] ? 'bg-tramit-blue' : 'bg-muted-foreground'}`}>
                {currentDate.getDate()}
              </div>
              <div>
                <p className="font-semibold text-lg">{DAYS_FULL_CA[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1]}, {currentDate.getDate()} {MONTHS_CA[currentDate.getMonth()]} {currentDate.getFullYear()}</p>
                {special.name && <p className="text-sm text-amber-600 dark:text-amber-400">🎌 {special.name}</p>}
                {isWeekend && <p className="text-sm text-muted-foreground">Cap de setmana</p>}
              </div>
              {dayAbsences.length > 0 && (
                <div className="ml-auto flex gap-2 flex-wrap">
                  {dayAbsences.map(abs => {
                    const profile = abs.profiles as { full_name: string; color: string | null } | null
                    const color = profile?.color || '#2272A3'
                    return (
                      <div key={abs.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium" style={{ backgroundColor: color + '20', color }}>
                        <div className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: color }}>
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

        {/* Horari per hores */}
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {HOURS.map(hour => (
                <div key={hour} className={`flex items-stretch min-h-[48px] ${isWeekend || special.holiday || special.closure ? 'bg-muted/20' : 'hover:bg-muted/10'} transition-colors`}>
                  <div className="w-16 px-3 py-3 text-xs text-muted-foreground text-right shrink-0 border-r border-border">
                    {hour}:00
                  </div>
                  <div className="flex-1 px-3 py-2">
                    {/* Aquí anirien les cites de la Fase 6 */}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Agenda</h1>
        <p className="text-muted-foreground mt-1">Calendari de vacances i absències de l&apos;equip</p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-base font-semibold min-w-[200px] text-center">{getHeaderTitle()}</h2>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={goToday} className="ml-1 px-3 py-1.5 rounded-lg bg-muted text-sm font-medium hover:bg-muted/80 transition-colors">
            Avui
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode de vista */}
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            {(['mes', 'setmana', 'dia'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${viewMode === mode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="all">Tots</option>
            {workers.map(p => <option key={p.id} value={p.id}>{p.full_name.split(' ')[0]}</option>)}
          </select>
        </div>
      </div>

      {/* Llegenda */}
      <div className="flex gap-3 flex-wrap">
        {workers.map(p => (
          <div key={p.id} className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: p.color || '#2272A3', fontSize: '9px', fontWeight: 700 }}>
              {getInitials(p.full_name)}
            </div>
            <span className="text-xs text-muted-foreground">{p.full_name.split(' ')[0]}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded bg-amber-100 dark:bg-amber-900/30 border border-amber-300" />
          <span className="text-xs text-muted-foreground">Festiu / Tancament</span>
        </div>
      </div>

      {/* Contingut segons mode */}
      {viewMode === 'mes' && renderMes()}
      {viewMode === 'setmana' && renderSetmana()}
      {viewMode === 'dia' && renderDia()}

      {/* Resum del mes (només en vista mes) */}
      {viewMode === 'mes' && (() => {
        const monthAbsences = absences.filter(abs => {
          const start = new Date(abs.start_date)
          const end = new Date(abs.end_date)
          const monthStart = new Date(year, month, 1)
          const monthEnd = new Date(year, month + 1, 0)
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
                      <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: color }}>
                        {getInitials(profile?.full_name || '?')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{profile?.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{abs.start_date} → {abs.end_date}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {abs.type === 'vacation' ? <Umbrella className="h-3.5 w-3.5 text-tramit-blue" /> : <ClipboardList className="h-3.5 w-3.5 text-slate-500" />}
                        <span className="text-xs text-muted-foreground">{abs.type === 'vacation' ? 'Vacances' : 'Absència'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })()}
    </div>
  )
}
