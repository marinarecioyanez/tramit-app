'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Umbrella, ClipboardList, CheckCircle,
  AlertTriangle, Plus, X, ChevronDown, ChevronUp
} from 'lucide-react'
import Link from 'next/link'

interface Request {
  id: string
  user_id: string
  type: string
  start_date: string
  end_date: string
  working_days: number
  status: string
  notes: string | null
  admin_note: string | null
  created_at: string
  profiles?: { full_name: string; color: string | null; email: string } | null
}

interface Balance {
  user_id: string
  total_days: number
  used_days: number
  pending_days: number
  profiles?: { full_name: string; color: string | null } | null
}

interface Profile {
  id: string
  full_name: string
  color: string | null
  role: string
  email: string
}

const TYPE_LABELS: Record<string, string> = {
  vacation: 'Vacances',
  sick_leave: 'Baixa mèdica',
  permission: 'Permís',
  other: 'Altres',
}

const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  pending: { label: 'Pendent', style: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  approved: { label: 'Aprovada', style: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  rejected: { label: 'Rebutjada', style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

type TabId = 'vacances' | 'absencies' | 'saldos'

export function EquipClient({
  requests,
  balances,
  profiles,
  holidays,
  closures,
  currentYear,
  today,
  isWorker = false,
  currentUserId,
}: {
  requests: Request[]
  balances: Balance[]
  profiles: Profile[]
  holidays: string[]
  closures: string[]
  currentYear: number
  today: string
  isWorker?: boolean
  currentUserId?: string
}) {
  const [activeTab, setActiveTab] = useState<TabId>('vacances')
  const [filterStatus, setFilterStatus] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [approving, setApproving] = useState<string | null>(null)
  const [adminNote, setAdminNote] = useState('')

  const supabase = createClient()

  const vacances = requests.filter(r => r.type === 'vacation')
  const absencies = requests.filter(r => r.type !== 'vacation')
  const pendingCount = requests.filter(r => r.status === 'pending').length

  const filteredVacances = filterStatus
    ? vacances.filter(r => r.status === filterStatus)
    : vacances

  const filteredAbsencies = filterStatus
    ? absencies.filter(r => r.status === filterStatus)
    : absencies

  async function handleDecision(id: string, action: 'approved' | 'rejected') {
    setApproving(id)
    try {
      await fetch('/api/vacances/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id, action, adminNote }),
      })
      setAdminNote('')
      setExpanded(null)
      window.location.reload()
    } finally {
      setApproving(null)
    }
  }

  function RequestCard({ req }: { req: Request }) {
    const isExpanded = expanded === req.id
    const profile = req.profiles as { full_name: string; color: string | null } | null
    const color = profile?.color || '#2272A3'
    const name = profile?.full_name || '—'
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    const isPending = req.status === 'pending'

    return (
      <Card className={isPending ? 'border-amber-200 dark:border-amber-800' : ''}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: color }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[req.status]?.style}`}>
                    {STATUS_CONFIG[req.status]?.label}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {TYPE_LABELS[req.type] || req.type}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {req.start_date} → {req.end_date}
                  {req.working_days > 0 && ` · ${req.working_days} dies`}
                </p>
                {req.notes && (
                  <p className="text-xs text-muted-foreground mt-0.5 italic">{req.notes}</p>
                )}
              </div>
            </div>
            {!isWorker && (
              <button
                onClick={() => setExpanded(isExpanded ? null : req.id)}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}
          </div>

          {isExpanded && !isWorker && (
            <div className="mt-4 pt-4 border-t space-y-3">
              {isPending && (
                <>
                  <div className="space-y-1.5">
                    <Label>Nota per al treballador (opcional)</Label>
                    <Input
                      value={adminNote}
                      onChange={e => setAdminNote(e.target.value)}
                      placeholder="Motiu, comentari..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="tramit"
                      size="sm"
                      onClick={() => handleDecision(req.id, 'approved')}
                      disabled={approving === req.id}
                      className="flex items-center gap-1.5"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      {approving === req.id ? 'Processant...' : 'Aprovar'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDecision(req.id, 'rejected')}
                      disabled={approving === req.id}
                      className="flex items-center gap-1.5 text-red-600 border-red-200"
                    >
                      <X className="h-3.5 w-3.5" />
                      Rebutjar
                    </Button>
                  </div>
                </>
              )}
              {req.admin_note && (
                <div className="bg-muted/50 rounded-lg px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    Nota admin: {req.admin_note}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const TABS: { id: TabId; label: string; count?: number }[] = [
    { id: 'vacances', label: 'Vacances', count: vacances.filter(r => r.status === 'pending').length || undefined },
    { id: 'absencies', label: 'Absències', count: absencies.filter(r => r.status === 'pending').length || undefined },
    { id: 'saldos', label: 'Saldos' },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Equip</h1>
          <p className="text-muted-foreground mt-1">
            Vacances, absències i saldos de l&apos;equip
            {pendingCount > 0 && !isWorker && (
              <span className="ml-2 text-amber-600 font-medium">
                · {pendingCount} pendent{pendingCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        {isWorker && (
          <Button asChild variant="tramit" className="flex items-center gap-2">
            <Link href="/worker/vacances/nova">
              <Plus className="h-4 w-4" />
              Sol·licitar vacances
            </Link>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.id === 'vacances' && <Umbrella className="h-3.5 w-3.5" />}
            {tab.id === 'absencies' && <ClipboardList className="h-3.5 w-3.5" />}
            {tab.label}
            {tab.count && tab.count > 0 && (
              <span className="bg-amber-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filtre estat */}
      {activeTab !== 'saldos' && (
        <div className="flex gap-2 flex-wrap">
          {(['', 'pending', 'approved', 'rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filterStatus === s
                  ? 'bg-tramit-blue text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === '' ? 'Totes' : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab: Vacances */}
      {activeTab === 'vacances' && (
        <div className="space-y-3">
          {filteredVacances.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <Umbrella className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Cap sol·licitud de vacances</p>
              </CardContent>
            </Card>
          ) : (
            filteredVacances.map(req => <RequestCard key={req.id} req={req} />)
          )}
        </div>
      )}

      {/* Tab: Absències */}
      {activeTab === 'absencies' && (
        <div className="space-y-3">
          {filteredAbsencies.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Cap absència registrada</p>
              </CardContent>
            </Card>
          ) : (
            filteredAbsencies.map(req => <RequestCard key={req.id} req={req} />)
          )}
        </div>
      )}

      {/* Tab: Saldos */}
      {activeTab === 'saldos' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase">Treballador</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground uppercase">Totals</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground uppercase">Usats</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground uppercase">Pendents</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground uppercase">Restants</th>
                      <th className="px-4 py-3 w-32"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {balances.map(bal => {
                      const p = bal.profiles as { full_name: string; color: string | null } | null
                      const remaining = bal.total_days - bal.used_days
                      const pct = bal.total_days > 0 ? (bal.used_days / bal.total_days) * 100 : 0
                      const color = p?.color || '#2272A3'
                      return (
                        <tr key={bal.user_id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                style={{ backgroundColor: color }}
                              >
                                {getInitials(p?.full_name || '?')}
                              </div>
                              <span className="font-medium">{p?.full_name || '—'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">{bal.total_days}</td>
                          <td className="px-4 py-3 text-center text-tramit-blue font-semibold">{bal.used_days}</td>
                          <td className="px-4 py-3 text-center">
                            {bal.pending_days > 0
                              ? <span className="text-amber-600 font-medium">{bal.pending_days}</span>
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${remaining <= 3 ? 'text-red-500' : 'text-green-600'}`}>
                              {remaining}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, backgroundColor: color }}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
