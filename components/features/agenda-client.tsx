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

interface Holiday {
  date: string
  name: string
}

interface Closure {
  date: string
  name: string
}

const DAYS_CA = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg']
const MONTHS_CA = [
  'Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny',
  'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'
]

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function AgendaClient({ absences, profiles, holidays, closures }: {
  absences: Absence[]
  profiles: Profile[]
  holidays: Holiday[]
  closures: Closure[]
}) {
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [filterUser, setFilterUser] = useState<string>('all')
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  const holidayDates = new Set(holidays.map(h => h.date))
  const closureDates = new Set(closures.map(c => c.date))

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Ajust per setmana que comença dilluns
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7
  const days: (Date | null)[] = []
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startDow + 1
    if (dayNum < 1 || dayNum > lastDay.getDate()) {
      days.push(null)
    } else {
      days.push(new Date(year, month, dayNum))
    }
  }

  function getAbsencesForDay(date: Date): Absence[] {
    const dateStr = date.toISOString().split('T')[0]
    return absences.filter(abs => {
      if (filterUser !== 'all' && abs.user_id !== filterUser) return false
      return dateStr >= abs.start_date && dateStr <= abs.end_date
    })
  }

  function getHolidayName(date: Date): string | null {
    const dateStr = date.toISOString().split('T')[0]
    const h = holidays.find(h => h.date === dateStr)
    const c = closures.find(c => c.date === dateStr)
    return h?.name || c?.name || null
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const workers = profiles.filter(p => p.role === 'worker')

  // Resum del mes
  const monthAbsences = absences.filter(abs => {
    const start = new Date(abs.start_date)
    const end = new Date(abs.end_date)
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0)
    return start <= monthEnd && end >= monthStart
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Agenda</h1>
        <p className="text-muted-foreground mt-1">Calendari de vacances i absències de l&apos;equip</p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold min-w-[160px] text-center">
            {MONTHS_CA[month]} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="ml-2 px-3 py-1.5 rounded-lg bg-muted text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            Avui
          </button>
        </div>

        <select
          value={filterUser}
          onChange={e => setFilterUser(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">Tots els treballadors</option>
          {workers.map(p => (
            <option key={p.id} value={p.id}>{p.full_name}</option>
          ))}
        </select>
      </div>

      {/* Llegenda */}
      <div className="flex gap-3 flex-wrap">
        {workers.map(p => (
          <div key={p.id} className="flex items-center gap-1.5">
            <div
              className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
              style={{ backgroundColor: p.color || '#2272A3' }}
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
      </div>

      {/* Calendari */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
          {/* Capçalera dies */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS_CA.map(day => (
              <div
                key={day}
                className={`py-2 text-center text-xs font-semibold ${
                  day === 'Ds' || day === 'Dg'
                    ? 'text-muted-foreground/50'
                    : 'text-muted-foreground'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Dies */}
          <div className="grid grid-cols-7">
            {days.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="min-h-[80px] border-b border-r border-border bg-muted/20" />
              }

              const dateStr = date.toISOString().split('T')[0]
              const isToday = dateStr === today.toISOString().split('T')[0]
              const isWeekend = date.getDay() === 0 || date.getDay() === 6
              const isHoliday = holidayDates.has(dateStr)
              const isClosure = closureDates.has(dateStr)
              const dayAbsences = getAbsencesForDay(date)
              const holidayName = getHolidayName(date)
              const isHovered = hoveredDay === dateStr

              return (
                <div
                  key={dateStr}
                  onMouseEnter={() => setHoveredDay(dateStr)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={`min-h-[80px] border-b border-r border-border p-1 relative transition-colors ${
                    isWeekend ? 'bg-muted/30' : ''
                  } ${isHoliday || isClosure ? 'bg-amber-50 dark:bg-amber-900/10' : ''} ${
                    isHovered ? 'bg-muted/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-tramit-blue text-white'
                        : isWeekend
                        ? 'text-muted-foreground/50'
                        : 'text-foreground'
                    }`}>
                      {date.getDate()}
                    </span>
                  </div>

                  {holidayName && (
                    <div className="text-[9px] text-amber-700 dark:text-amber-400 leading-tight mb-1 truncate" title={holidayName}>
                      {holidayName}
                    </div>
                  )}

                  <div className="space-y-0.5">
                    {dayAbsences.slice(0, 3).map(abs => {
                      const profile = abs.profiles as { full_name: string; color: string | null } | null
                      const color = profile?.color || '#2272A3'
                      const name = profile?.full_name || '—'
                      const initials = getInitials(name)
                      return (
                        <div
                          key={abs.id}
                          className="flex items-center gap-1 rounded px-1 py-0.5"
                          style={{ backgroundColor: color + '25', borderLeft: `2px solid ${color}` }}
                          title={`${name} — ${abs.type === 'vacation' ? 'Vacances' : 'Absència'}`}
                        >
                          <div
                            className="h-3.5 w-3.5 rounded-full flex items-center justify-center text-white shrink-0"
                            style={{ backgroundColor: color, fontSize: '7px', fontWeight: 700 }}
                          >
                            {initials}
                          </div>
                          <span className="text-[9px] truncate font-medium" style={{ color }}>
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

      {/* Resum del mes */}
      {monthAbsences.length > 0 && (
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
      )}
    </div>
  )
}
