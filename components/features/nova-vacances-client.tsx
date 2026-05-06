'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Umbrella, AlertTriangle, CheckCircle,
  ArrowLeft, Calendar, Info
} from 'lucide-react'
import Link from 'next/link'

interface Balance {
  total_days: number
  used_days: number
  pending_days: number
  carry_over_days: number
}

interface ExistingRequest {
  start_date: string
  end_date: string
  status: string
}

interface Props {
  balance: Balance | null
  holidays: string[]
  closures: string[]
  existingRequests: ExistingRequest[]
  userId: string
}

function calculateWorkingDays(
  start: string,
  end: string,
  holidays: string[],
  closures: string[]
): number {
  const nonWorking = new Set([...holidays, ...closures])
  let count = 0
  const current = new Date(start + 'T12:00:00')
  const endDate = new Date(end + 'T12:00:00')
  while (current <= endDate) {
    const day = current.getDay()
    const dateStr = current.toISOString().split('T')[0]
    if (day !== 0 && day !== 6 && !nonWorking.has(dateStr)) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

function hasOverlap(
  start: string,
  end: string,
  existing: ExistingRequest[]
): boolean {
  return existing.some(req =>
    start <= req.end_date && end >= req.start_date
  )
}

const MONTH_NAMES = [
  'Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny',
  'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'
]

const DAYS_CA = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg']

export function NovaVacancesClient({
  balance,
  holidays,
  closures,
  existingRequests,
  userId,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const today = new Date()
  const [calendarDate, setCalendarDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  )
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const holidaySet = useMemo(() => new Set(holidays), [holidays])
  const closureSet = useMemo(() => new Set(closures), [closures])

  const remaining = balance ? balance.total_days - balance.used_days : 0

  const workingDays = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return 0
    return calculateWorkingDays(startDate, endDate, holidays, closures)
  }, [startDate, endDate, holidays, closures])

  const hasConflict = useMemo(() => {
    if (!startDate || !endDate) return false
    return hasOverlap(startDate, endDate, existingRequests)
  }, [startDate, endDate, existingRequests])

  const canSubmit = startDate && endDate && endDate >= startDate &&
    workingDays > 0 && workingDays <= remaining && !hasConflict

  // Calendari visual
  const year = calendarDate.getFullYear()
  const month = calendarDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7
  const calDays: (Date | null)[] = []
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startDow + 1
    if (dayNum < 1 || dayNum > lastDay.getDate()) calDays.push(null)
    else calDays.push(new Date(year, month, dayNum))
  }

  function handleDayClick(date: Date) {
    const dateStr = date.toISOString().split('T')[0]
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const isHoliday = holidaySet.has(dateStr)
    const isClosure = closureSet.has(dateStr)

    if (isWeekend || isHoliday || isClosure) return

    if (!startDate || (startDate && endDate)) {
      setStartDate(dateStr)
      setEndDate('')
    } else if (dateStr >= startDate) {
      setEndDate(dateStr)
    } else {
      setStartDate(dateStr)
      setEndDate('')
    }
  }

  function getDayState(date: Date): string {
    const dateStr = date.toISOString().split('T')[0]
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const isHoliday = holidaySet.has(dateStr)
    const isClosure = closureSet.has(dateStr)
    const isExisting = existingRequests.some(r =>
      dateStr >= r.start_date && dateStr <= r.end_date
    )

    if (isWeekend) return 'weekend'
    if (isHoliday || isClosure) return 'holiday'
    if (isExisting) return 'existing'

    if (startDate && endDate) {
      if (dateStr === startDate || dateStr === endDate) return 'selected-edge'
      if (dateStr > startDate && dateStr < endDate) return 'selected-range'
    } else if (startDate && dateStr === startDate) {
      return 'selected-edge'
    }

    return 'normal'
  }

  const dayStyles: Record<string, string> = {
    weekend: 'text-muted-foreground/40 cursor-default',
    holiday: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 cursor-default',
    existing: 'bg-slate-100 dark:bg-slate-800 text-muted-foreground cursor-not-allowed line-through',
    'selected-edge': 'bg-tramit-blue text-white font-bold rounded-full',
    'selected-range': 'bg-tramit-blue/20 dark:bg-tramit-blue/30 text-tramit-blue',
    normal: 'hover:bg-muted cursor-pointer rounded-full',
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!canSubmit) return

    setSaving(true)
    try {
      // Actualitzar pending_days
      if (balance) {
        await supabase
          .from('vacation_balances')
          .update({ pending_days: (balance.pending_days || 0) + workingDays })
          .eq('user_id', userId)
          .eq('year', new Date().getFullYear())
      }

      const { error: insertError } = await supabase
        .from('absence_requests')
        .insert({
          user_id: userId,
          type: 'vacation',
          start_date: startDate,
          end_date: endDate,
          working_days: workingDays,
          status: 'pending',
          notes: notes || null,
          deducts_vacation: true,
        })

      if (insertError) throw insertError

      setSuccess(true)
      setTimeout(() => router.push('/worker/vacances'), 2000)
    } catch {
      setError("S'ha produït un error. Torna-ho a intentar.")
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto pt-12 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold">Sol·licitud enviada!</h2>
        <p className="text-muted-foreground">
          La teva sol·licitud de <strong>{workingDays} dies</strong> ha estat enviada a l&apos;administració per a la seva aprovació.
        </p>
        <p className="text-sm text-muted-foreground">Redirigint...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Capçalera */}
      <div className="flex items-center gap-3">
        <Link href="/worker/vacances" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nova sol·licitud de vacances</h1>
          <p className="text-muted-foreground mt-0.5">Selecciona les dates al calendari</p>
        </div>
      </div>

      {/* Saldo disponible */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Dies totals', value: balance?.total_days || 0, color: 'text-foreground' },
          { label: 'Dies usats', value: balance?.used_days || 0, color: 'text-tramit-blue' },
          { label: 'Dies disponibles', value: remaining, color: remaining <= 3 ? 'text-red-500' : 'text-green-600' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="pt-3 pb-3 text-center">
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {remaining === 0 && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">No tens dies de vacances disponibles per a {new Date().getFullYear()}.</p>
        </div>
      )}

      {/* Calendari interactiu */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Selecciona les dates
            </CardTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                ‹
              </button>
              <span className="text-sm font-medium min-w-[130px] text-center">
                {MONTH_NAMES[month]} {year}
              </span>
              <button
                onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                ›
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Dies de la setmana */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_CA.map(d => (
              <div key={d} className={`text-center text-xs font-semibold py-1 ${d === 'Ds' || d === 'Dg' ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Dies */}
          <div className="grid grid-cols-7 gap-0.5">
            {calDays.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} />

              const dateStr = date.toISOString().split('T')[0]
              const state = getDayState(date)
              const isToday = dateStr === today.toISOString().split('T')[0]
              const holidayName = holidays.includes(dateStr)
                ? 'Festiu'
                : closures.includes(dateStr)
                ? 'Tancament'
                : null

              return (
                <div
                  key={dateStr}
                  onClick={() => handleDayClick(date)}
                  title={holidayName || undefined}
                  className={`
                    relative flex items-center justify-center h-9 text-sm transition-all select-none
                    ${dayStyles[state] || dayStyles.normal}
                    ${isToday && state === 'normal' ? 'font-bold text-tramit-blue' : ''}
                  `}
                >
                  {date.getDate()}
                  {isToday && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-tramit-blue" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Llegenda */}
          <div className="flex gap-4 mt-4 flex-wrap">
            {[
              { color: 'bg-tramit-blue', label: 'Seleccionat' },
              { color: 'bg-amber-100 dark:bg-amber-900/20 border border-amber-300', label: 'Festiu/Tancament' },
              { color: 'bg-slate-100 dark:bg-slate-800', label: 'Ja sol·licitat' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={`h-3 w-3 rounded-sm ${item.color}`} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resum de la selecció */}
      {startDate && (
        <Card className={`border-2 ${canSubmit ? 'border-tramit-blue/30' : workingDays > remaining ? 'border-red-300' : 'border-muted'}`}>
          <CardContent className="pt-4 pb-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Data d&apos;inici</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => { setStartDate(e.target.value); setEndDate('') }}
                    min={today.toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Data de fi</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    min={startDate}
                  />
                </div>
              </div>

              {workingDays > 0 && (
                <div className={`rounded-lg px-4 py-3 ${workingDays > remaining ? 'bg-r
