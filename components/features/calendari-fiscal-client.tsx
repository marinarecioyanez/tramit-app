'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertCircle, Calendar, Clock, CheckCircle,
  Filter, Download, ChevronRight
} from 'lucide-react'

interface Deadline {
  id: string
  date: string
  name: string
  model: string | null
  description: string | null
  year: number
}

const MODEL_CATEGORIES: Record<string, { label: string; color: string; bg: string }> = {
  '303': { label: 'IVA', color: 'text-blue-700', bg: 'bg-blue-100 dark:bg-blue-900/20' },
  '390': { label: 'IVA anual', color: 'text-blue-700', bg: 'bg-blue-100 dark:bg-blue-900/20' },
  '347': { label: 'Operacions', color: 'text-blue-700', bg: 'bg-blue-100 dark:bg-blue-900/20' },
  '349': { label: 'Intracomunitari', color: 'text-blue-700', bg: 'bg-blue-100 dark:bg-blue-900/20' },
  '130': { label: 'IRPF', color: 'text-green-700', bg: 'bg-green-100 dark:bg-green-900/20' },
  '131': { label: 'IRPF mòduls', color: 'text-green-700', bg: 'bg-green-100 dark:bg-green-900/20' },
  '200': { label: 'Societats', color: 'text-purple-700', bg: 'bg-purple-100 dark:bg-purple-900/20' },
  '202': { label: 'Soc. fraccionat', color: 'text-purple-700', bg: 'bg-purple-100 dark:bg-purple-900/20' },
  '100': { label: 'Renda', color: 'text-amber-700', bg: 'bg-amber-100 dark:bg-amber-900/20' },
  '714': { label: 'Patrimoni', color: 'text-rose-700', bg: 'bg-rose-100 dark:bg-rose-900/20' },
}

const MONTH_NAMES = [
  'Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny',
  'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'
]

function getDaysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getUrgencyConfig(daysLeft: number): { style: string; label: string } {
  if (daysLeft < 0) return { style: 'border-slate-200 dark:border-slate-700 opacity-60', label: 'Passat' }
  if (daysLeft === 0) return { style: 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/10', label: 'Avui!' }
  if (daysLeft <= 3) return { style: 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10', label: `${daysLeft} dies` }
  if (daysLeft <= 7) return { style: 'border-amber-300 dark:border-amber-700', label: `${daysLeft} dies` }
  if (daysLeft <= 14) return { style: 'border-yellow-200 dark:border-yellow-800', label: `${daysLeft} dies` }
  return { style: 'border-border', label: `${daysLeft} dies` }
}

export function CalendariFiscalClient({
  deadlines,
  currentYear,
}: {
  deadlines: Deadline[]
  currentYear: number
}) {
  const [filterYear, setFilterYear] = useState(currentYear)
  const [filterModel, setFilterModel] = useState('')
  const [showPast, setShowPast] = useState(false)
  const [viewMode, setViewMode] = useState<'timeline' | 'month'>('timeline')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const filtered = useMemo(() => {
    let result = deadlines.filter(d => d.year === filterYear)
    if (filterModel) result = result.filter(d => d.model === filterModel)
    if (!showPast) result = result.filter(d => new Date(d.date + 'T00:00:00') >= today)
    return result
  }, [deadlines, filterYear, filterModel, showPast])

  const byMonth = useMemo(() => {
    const months: Record<number, Deadline[]> = {}
    filtered.forEach(d => {
      const month = new Date(d.date + 'T00:00:00').getMonth()
      if (!months[month]) months[month] = []
      months[month].push(d)
    })
    return months
  }, [filtered])

  const nextDeadline = deadlines
    .filter(d => getDaysUntil(d.date) >= 0)
    .sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date))[0]

  const urgentCount = deadlines.filter(d => {
    const days = getDaysUntil(d.date)
    return days >= 0 && days <= 7
  }).length

  function exportICS() {
    const events = filtered.map(d => {
      const date = d.date.replace(/-/g, '')
      return [
        'BEGIN:VEVENT',
        `DTSTART;VALUE=DATE:${date}`,
        `DTEND;VALUE=DATE:${date}`,
        `SUMMARY:${d.name}${d.model ? ` (Model ${d.model})` : ''}`,
        `DESCRIPTION:${d.description || ''}`,
        `UID:tramit-fiscal-${d.id}`,
        'END:VEVENT',
      ].join('\r\n')
    })

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Tràmit Economistes//Calendari Fiscal//CA',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `calendari-fiscal-${filterYear}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

const availableModels = Array.from(new Set(deadlines.filter(d => d.model).map(d => d.model!)))
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Calendari Fiscal</h1>
          <p className="text-muted-foreground mt-1">
            Terminis de presentació de models fiscals
            {urgentCount > 0 && (
              <span className="ml-2 text-red-600 font-medium">· {urgentCount} urgent{urgentCount > 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportICS} className="flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Exportar ICS
          </Button>
        </div>
      </div>

      {/* Proper termini */}
      {nextDeadline && (
        <Card className={`${getDaysUntil(nextDeadline.date) <= 7 ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/5' : 'border-tramit-blue/30 bg-tramit-blue-light/30 dark:bg-blue-900/10'}`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <div className={`text-center px-4 py-3 rounded-xl ${getDaysUntil(nextDeadline.date) <= 7 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-tramit-blue text-white'} min-w-[70px]`}>
                <p className={`text-2xl font-bold ${getDaysUntil(nextDeadline.date) <= 7 ? 'text-red-700 dark:text-red-400' : 'text-white'}`}>
                  {getDaysUntil(nextDeadline.date) === 0 ? 'Avui' : getDaysUntil(nextDeadline.date)}
                </p>
                {getDaysUntil(nextDeadline.date) > 0 && (
                  <p className={`text-xs ${getDaysUntil(nextDeadline.date) <= 7 ? 'text-red-600' : 'text-white/80'}`}>
                    dies
                  </p>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{nextDeadline.name}</p>
                  {nextDeadline.model && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MODEL_CATEGORIES[nextDeadline.model]?.bg || 'bg-muted'} ${MODEL_CATEGORIES[nextDeadline.model]?.color || 'text-foreground'}`}>
                      Model {nextDeadline.model}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(nextDeadline.date + 'T00:00:00').toLocaleDateString('ca-ES', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtres i controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {[currentYear, currentYear + 1].map(y => (
            <button
              key={y}
              onClick={() => setFilterYear(y)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filterYear === y ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {(['timeline', 'month'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === mode ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {mode === 'timeline' ? 'Llista' : 'Per mesos'}
            </button>
          ))}
        </div>

        <select
          value={filterModel}
          onChange={e => setFilterModel(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Tots els models</option>
          {availableModels.map(m => (
            <option key={m} value={m}>
              Model {m} — {MODEL_CATEGORIES[m]?.label || m}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowPast(!showPast)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            showPast ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CheckCircle className="h-3.5 w-3.5" />
          {showPast ? 'Amagar passats' : 'Mostrar passats'}
        </button>
      </div>

      {/* Vista Timeline */}
      {viewMode === 'timeline' && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Cap termini fiscal en el període seleccionat</p>
              </CardContent>
            </Card>
          ) : (
            filtered.map(d => {
              const daysLeft = getDaysUntil(d.date)
              const urgency = getUrgencyConfig(daysLeft)
              const isPast = daysLeft < 0
              const category = d.model ? MODEL_CATEGORIES[d.model] : null

              return (
                <Card key={d.id} className={`border transition-colors ${urgency.style}`}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center gap-4">
                      {/* Data */}
                      <div className="text-center min-w-[50px]">
                        <p className={`text-lg font-bold leading-none ${isPast ? 'text-muted-foreground' : ''}`}>
                          {new Date(d.date + 'T00:00:00').getDate()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {MONTH_NAMES[new Date(d.date + 'T00:00:00').getMonth()].slice(0, 3)}
                        </p>
                      </div>

                      {/* Contingut */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-medium ${isPast ? 'line-through text-muted-foreground' : ''}`}>
                            {d.name}
                          </p>
                          {d.model && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${category?.bg || 'bg-muted'} ${category?.color || 'text-foreground'}`}>
                              Model {d.model}
                              {category && ` · ${category.label}`}
                            </span>
                          )}
                        </div>
                        {d.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>
                        )}
                      </div>

                      {/* Dies restants */}
                      <div className="text-right shrink-0">
                        {isPast ? (
                          <span className="text-xs text-muted-foreground">Passat</span>
                        ) : daysLeft === 0 ? (
                          <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Avui!
                          </span>
                        ) : (
                          <span className={`text-xs font-medium ${
                            daysLeft <= 3 ? 'text-red-600' :
                            daysLeft <= 7 ? 'text-amber-600' :
                            'text-muted-foreground'
                          }`}>
                            {daysLeft <= 7 && <AlertCircle className="h-3 w-3 inline mr-0.5" />}
                            {urgency.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Vista Per mesos */}
      {viewMode === 'month' && (
        <div className="space-y-4">
          {Object.entries(byMonth)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([monthIdx, monthDeadlines]) => (
              <Card key={monthIdx}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {MONTH_NAMES[Number(monthIdx)]} {filterYear}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({monthDeadlines.length} termini{monthDeadlines.length > 1 ? 's' : ''})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {monthDeadlines.map(d => {
                      const daysLeft = getDaysUntil(d.date)
                      const isPast = daysLeft < 0
                      const category = d.model ? MODEL_CATEGORIES[d.model] : null

                      return (
                        <div key={d.id} className={`flex items-center gap-3 p-2.5 rounded-lg ${isPast ? 'opacity-60' : 'bg-muted/30'}`}>
                          <div className="text-center w-8">
                            <p className="text-sm font-bold">{new Date(d.date + 'T00:00:00').getDate()}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${isPast ? 'line-through' : ''}`}>{d.name}</p>
                          </div>
                          {d.model && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${category?.bg || 'bg-muted'} ${category?.color || ''}`}>
                              {d.model}
                            </span>
                          )}
                          {!isPast && daysLeft <= 7 && (
                            <span className="text-xs text-red-600 font-medium shrink-0">
                              {daysLeft === 0 ? 'Avui!' : `${daysLeft}d`}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  )
}
