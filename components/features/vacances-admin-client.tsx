'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Clock, Umbrella, ChevronDown, ChevronUp } from 'lucide-react'

interface Request {
  id: string
  user_id: string
  start_date: string
  end_date: string
  working_days: number
  status: string
  notes: string | null
  admin_note: string | null
  created_at: string
  profiles?: { full_name: string; email: string } | null
}

interface Balance {
  id: string
  user_id: string
  total_days: number
  used_days: number
  pending_days: number
  profiles?: { full_name: string } | null
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

export function VacancesAdminClient({ requests, balances }: { requests: Request[]; balances: Balance[] }) {
  const [tab, setTab] = useState<'sol·licituds' | 'saldos'>('sol·licituds')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [adminNote, setAdminNote] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const supabase = createClient()

  const filtered = requests.filter(r => filter === 'all' || r.status === filter)
  const pendingCount = requests.filter(r => r.status === 'pending').length

  async function handleAction(id: string, action: 'approved' | 'rejected') {
    setLoading(id)
    await supabase
      .from('absence_requests')
      .update({
        status: action,
        admin_note: adminNote[id] || null,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)

    // Actualitzar saldo si s'aprova
    if (action === 'approved') {
      const req = requests.find(r => r.id === id)
      if (req) {
        const { data: balance } = await supabase
          .from('vacation_balances')
          .select('used_days, pending_days')
          .eq('user_id', req.user_id)
          .eq('year', new Date().getFullYear())
          .single()

        if (balance) {
          await supabase
            .from('vacation_balances')
            .update({
              used_days: (balance.used_days || 0) + req.working_days,
              pending_days: Math.max(0, (balance.pending_days || 0) - req.working_days),
            })
            .eq('user_id', req.user_id)
            .eq('year', new Date().getFullYear())
        }
      }
    }

    setLoading(null)
    window.location.reload()
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Vacances</h1>
        <p className="text-muted-foreground mt-1">Gestió de sol·licituds i saldos de vacances</p>
      </div>

      {/* Tabs principals */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('sol·licituds')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === 'sol·licituds' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Clock className="h-4 w-4" />
          Sol·licituds
          {pendingCount > 0 && (
            <span className="ml-1 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('saldos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === 'saldos' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Umbrella className="h-4 w-4" />
          Saldos
        </button>
      </div>

      {/* Sol·licituds */}
      {tab === 'sol·licituds' && (
        <div className="space-y-4">
          {/* Filtres */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filter === f
                    ? 'bg-tramit-blue text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === 'all' ? 'Totes' : STATUS_LABELS[f]}
                {f === 'pending' && pendingCount > 0 && ` (${pendingCount})`}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Cap sol·licitud en aquest estat</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(req => (
                <Card key={req.id} className={req.status === 'pending' ? 'border-amber-200 dark:border-amber-800' : ''}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">
                            {(req.profiles as { full_name: string } | null)?.full_name || '—'}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[req.status]}`}>
                            {STATUS_LABELS[req.status]}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {req.start_date} → {req.end_date}
                          <span className="ml-2 font-medium text-foreground">{req.working_days} dies laborables</span>
                        </p>
                        {req.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">&ldquo;{req.notes}&rdquo;</p>
                        )}
                        {req.admin_note && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium">Nota admin:</span> {req.admin_note}
                          </p>
                        )}
                      </div>

                      {req.status === 'pending' && (
                        <button
                          onClick={() => setExpanded(expanded === req.id ? null : req.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {expanded === req.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      )}
                    </div>

                    {/* Panell d'aprovació */}
                    {req.status === 'pending' && expanded === req.id && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Nota opcional per al treballador</label>
                          <input
                            type="text"
                            placeholder="Escriu una nota..."
                            value={adminNote[req.id] || ''}
                            onChange={e => setAdminNote(prev => ({ ...prev, [req.id]: e.target.value }))}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="tramit"
                            disabled={loading === req.id}
                            onClick={() => handleAction(req.id, 'approved')}
                            className="flex items-center gap-1.5"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loading === req.id}
                            onClick={() => handleAction(req.id, 'rejected')}
                            className="flex items-center gap-1.5 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Rebutjar
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Saldos */}
      {tab === 'saldos' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saldos de vacances {new Date().getFullYear()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {balances.map(bal => {
                const remaining = bal.total_days - bal.used_days
                const pct = Math.round((bal.used_days / bal.total_days) * 100)
                return (
                  <div key={bal.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {(bal.profiles as { full_name: string } | null)?.full_name || '—'}
                      </span>
                      <span className="text-muted-foreground">
                        <span className="font-semibold text-foreground">{remaining}</span> restants de {bal.total_days}
                        {bal.pending_days > 0 && (
                          <span className="ml-2 text-amber-600 dark:text-amber-400">({bal.pending_days} pendents)</span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-tramit-blue transition-all"
                        style={{ width: `${pct}%` }}
                      />
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
