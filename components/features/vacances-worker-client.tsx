'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Umbrella, Plus, X, CheckCircle, AlertTriangle, ClipboardList } from 'lucide-react'

interface Balance {
  total_days: number
  used_days: number
  pending_days: number
}

interface Request {
  id: string
  type: string
  start_date: string
  end_date: string
  working_days: number
  status: string
  notes: string | null
  admin_note: string | null
  created_at: string
}

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  approved:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendent', approved: 'Aprovada',
  rejected: 'Rebutjada', cancelled: 'Cancel·lada',
}

const ABSENCE_TYPE_LABELS: Record<string, string> = {
  sick_leave: 'Baixa mèdica',
  permission: 'Permís',
  other: 'Altre',
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
  const [tab, setTab] = useState<'vacances' | 'absencies'>('vacances')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Formulari vacances
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')

  // Formulari absència
  const [absForm, setAbsForm] = useState({
    type: 'permission',
    start_date: '',
    end_date: '',
    notes: '',
  })

  const supabase = createClient()

  const vacancesRequests = requests.filter(r => r.type === 'vacation')
  const absenciesRequests = requests.filter(r => r.type !== 'vacation')
  const remaining = balance ? balance.total_days - balance.used_days : 0
  const workingDays = startDate && endDate && endDate >= startDate
    ? calculateWorkingDays(startDate, endDate, holidays, closures) : 0

  async function handleSubmitVacances(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (workingDays <= 0) { setError('Les dates no inclouen dies laborables.'); return }
    if (workingDays > remaining) { setError(`No tens suficients dies. Tens ${remaining} dies restants.`); return }
    setSaving(true)
    try {
      if (balance) {
        await supabase.from('vacation_balances')
          .update({ pending_days: (balance.pending_days || 0) + workingDays })
          .eq('user_id', userId).eq('year', new Date().getFullYear())
      }
      const { error: insertError } = await supabase.from('absence_requests').insert({
        user_id: userId, type: 'vacation',
        start_date: startDate, end_date: endDate,
        working_days: workingDays, status: 'pending',
        notes: notes || null, deducts_vacation: true,
      })
      if (insertError) throw insertError
      setSuccess(true)
      setShowForm(false)
      setStartDate(''); setEndDate(''); setNotes('')
      setTimeout(() => { setSuccess(false); window.location.reload() }, 2000)
    } catch { setError("S'ha produït un error. Torna-ho a intentar.") }
    finally { setSaving(false) }
  }

  async function handleSubmitAbsencia(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!absForm.start_date) { setError('Cal seleccionar una data d\'inici.'); return }
    setSaving(true)
    try {
      const wDays = absForm.end_date
        ? calculateWorkingDays(absForm.start_date, absForm.end_date, holidays, closures)
        : 1
      const { error: insertError } = await supabase.from('absence_requests').insert({
        user_id: userId, type: absForm.type,
        start_date: absForm.start_date,
        end_date: absForm.end_date || absForm.start_date,
        working_days: wDays, status: 'pending',
        notes: absForm.notes || null, deducts_vacation: false,
      })
      if (insertError) throw insertError
      setSuccess(true)
      setShowForm(false)
      setAbsForm({ type: 'permission', start_date: '', end_date: '', notes: '' })
      setTimeout(() => { setSuccess(false); window.location.reload() }, 2000)
    } catch { setError("S'ha produït un error. Torna-ho a intentar.") }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Vacances i absències</h1>
        <p className="text-muted-foreground mt-1">Les teves sol·licituds {new Date().getFullYear()}</p>
      </div>

      {/* Saldo vacances */}
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
