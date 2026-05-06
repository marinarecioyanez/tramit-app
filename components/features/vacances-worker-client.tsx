'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Umbrella, Plus, X, CheckCircle, AlertTriangle } from 'lucide-react'

interface Balance {
  total_days: number
  used_days: number
  pending_days: number
}

interface Request {
  id: string
  start_date: string
  end_date: string
  working_days: number
  status: string
  notes: string | null
  admin_note: string | null
  created_at: string
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendent',
  approved: 'Aprovada',
  rejected: 'Rebutjada',
  cancelled: 'Cancel·lada',
}

function calculateWorkingDays(start: string, end: string, holidays: string[], closures: string[]): number {
  const nonWorking = new Set([...holidays, ...closures])
  let count = 0
  const current = new Date(start)
  const endDate = new Date(end)
  while (current <= endDate) {
    const day = current.getDay()
    const dateStr = current.toISOString().split('T')[0]
    if (day !== 0 && day !== 6 && !nonWorking.has(dateStr)) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

interface Props {
  balance: Balance | null
  requests: Request[]
  holidays: string[]
  closures: string[]
  userId: string
}

export function VacancesWorkerClient({ balance, requests, holidays, closures, userId }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const remaining = balance ? balance.total_days - balance.used_days : 0
  const workingDays = startDate && endDate && endDate >= startDate
    ? calculateWorkingDays(startDate, endDate, holidays, closures)
    : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (workingDays <= 0) {
      setError('Les dates seleccionades no inclouen dies laborables.')
      return
    }
    if (workingDays > remaining) {
      setError(`No tens suficients dies disponibles. Tens ${remaining} dies restants.`)
      return
    }

    setSaving(true)
    try {
      // Actualitzar pending_days al balance
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
      setShowForm(false)
      setStartDate('')
      setEndDate('')
      setNotes('')
      setTimeout(() => {
        setSuccess(false)
        window.location.reload()
      }, 2000)
    } catch {
      setError("S'ha produït un error. Torna-ho a intentar.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Les meves vacances</h1>
        <p className="text-muted-foreground mt-1">Sol·licituds i saldo de vacances {new Date().getFullYear()}</p>
      </div>

      {/* Saldo */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Dies totals', value: balance?.total_days || 0, color: 'text-foreground' },
          { label: 'Dies usats', value: balance?.used_days || 0, color: 'text-tramit-blue' },
          { label: 'Dies restants', value: remaining, color: remaining <= 3 ? 'text-red-500' : 'text-green-600' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {balance?.pending_days ? (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          ⏳ {balance.pending_days} dies pendents d&apos;aprovació
        </p>
      ) : null}

      {/* Botó nova sol·licitud */}
      {!showForm && (
        <Button variant="tramit" onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova sol·licitud de vacances
        </Button>
      )}

      {success && (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-4 py-3 rounded-lg">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Sol·licitud enviada correctament!</span>
        </div>
      )}

      {/* Formulari */}
      {showForm && (
        <Card className="border-tramit-blue/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nova sol·licitud</CardTitle>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Data d&apos;inici</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Data de fi</Label>
                  <Input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={e => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {workingDays > 0 && (
                <div className="rounded-lg bg-tramit-blue-light dark:bg-blue-900/20 px-4 py-3">
                  <p className="text-sm font-medium text-tramit-blue dark:text-blue-300">
                    Dies laborables: <span className="text-lg font-bold">{workingDays}</span>
                    {workingDays > remaining && (
                      <span className="ml-2 text-red-500">⚠️ Supera el saldo disponible</span>
                    )}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Notes <span className="text-muted-foreground">(opcional)</span></Label>
                <Input
                  type="text"
                  placeholder="Afegeix una nota per a l'admin..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" variant="tramit" disabled={saving || workingDays === 0}>
                  {saving ? 'Enviant...' : 'Enviar sol·licitud'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel·lar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de sol·licituds</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Umbrella className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Encara no has fet cap sol·licitud</p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{req.start_date} → {req.end_date}</p>
                    <p className="text-xs text-muted-foreground">
                      {req.working_days} dies laborables
                      {req.admin_note && ` · "${req.admin_note}"`}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[req.status]}`}>
                    {STATUS_LABELS[req.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
