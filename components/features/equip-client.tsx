'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Users, Umbrella, ClipboardList, TrendingUp,
  Plus, X, ChevronDown, ChevronUp, Pencil, Save,
  CheckCircle, AlertTriangle, Mail, Phone
} from 'lucide-react'

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
  year: number
  total_days: number
  used_days: number
  pending_days: number
  remaining_days?: number
  profiles?: { full_name: string; color: string | null } | null
}

interface Profile {
  id: string
  full_name: string
  color: string | null
  role: string
  email: string
  phone: string | null
  active: boolean
}

const TYPE_LABELS: Record<string, string> = {
  vacation: 'Vacances',
  sick_leave: 'Baixa mèdica',
  permission: 'Permís',
  other: 'Altres',
}

const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  pending:  { label: 'Pendent',  style: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  approved: { label: 'Aprovada', style: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  rejected: { label: 'Rebutjada', style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administradora',
  supervisor: 'Supervisor',
  worker: 'Treballador/a',
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

type TabId = 'equip' | 'vacances' | 'absencies' | 'saldos'

export function EquipClient({
  requests,
  balances,
  profiles,
  currentYear,
  isWorker = false,
  currentUserId,
}: {
  requests: Request[]
  balances: Balance[]
  profiles: Profile[]
  currentYear: number
  isWorker?: boolean
  currentUserId?: string
}) {
  const [activeTab, setActiveTab] = useState<TabId>('equip')
  const [filterStatus, setFilterStatus] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [approving, setApproving] = useState<string | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [editingBalance, setEditingBalance] = useState<string | null>(null)
  const [editBalanceValue, setEditBalanceValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const supabase = createClient()

  const vacances = requests.filter(r => r.type === 'vacation')
  const absencies = requests.filter(r => r.type !== 'vacation')
  const pendingCount = requests.filter(r => r.status === 'pending').length

  const filteredVacances = filterStatus ? vacances.filter(r => r.status === filterStatus) : vacances
  const filteredAbs = filterStatus ? absencies.filter(r => r.status === filterStatus) : absencies

  async function handleApprove(id: string, status: 'approved' | 'rejected') {
    setApproving(id)
    try {
      const res = await fetch('/api/vacances/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, admin_note: adminNote }),
      })
      if (res.ok) {
        setMsg({ type: 'ok', text: status === 'approved' ? 'Aprovada correctament' : 'Rebutjada' })
        setTimeout(() => window.location.reload(), 1000)
      }
    } finally {
      setApproving(null)
      setAdminNote('')
    }
  }

  async function handleSaveBalance(userId: string, year: number) {
    setSaving(true)
    const newTotal = parseInt(editBalanceValue)
    if (isNaN(newTotal) || newTotal < 0) { setSaving(false); return }
    const { error } = await supabase
      .from('vacation_balances')
      .upsert({ user_id: userId, year, total_days: newTotal }, { onConflict: 'user_id,year' })
    setSaving(false)
    if (!error) {
      setEditingBalance(null)
      setMsg({ type: 'ok', text: 'Saldo actualitzat' })
      setTimeout(() => { setMsg(null); window.location.reload() }, 1500)
    }
  }

  const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { id: 'equip',     label: 'Equip',     icon: Users },
    { id: 'vacances',  label: 'Vacances',  icon: Umbrella,      count: pendingCount },
    { id: 'absencies', label: 'Absències', icon: ClipboardList },
    { id: 'saldos',    label: 'Saldos',    icon: TrendingUp },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equip</h1>
          <p className="text-muted-foreground mt-1">{profiles.length} membres · Any {currentYear}</p>
        </div>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${msg.type === 'ok' ? 'bg-green-50 text-green-700 dark:bg-green-900/20' : 'bg-red-50 text-red-700'}`}>
          {msg.type === 'ok' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit flex-wrap">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}>
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.count ? (
                <span className="bg-amber-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">{tab.count}</span>
              ) : null}
            </button>
          )
        })}
      </div>

      {/* TAB EQUIP */}
      {activeTab === 'equip' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {profiles.map(profile => (
            <Card key={profile.id} className={!profile.active ? 'opacity-60' : ''}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0"
                    style={{ backgroundColor: profile.color || '#2272A3' }}
                  >
                    {getInitials(profile.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{profile.full_name}</p>
                      {!profile.active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Inactiu</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{ROLE_LABELS[profile.role] || profile.role}</p>
                    <div className="mt-2 space-y-1">
                      {profile.email && (
                        <a href={`mailto:${profile.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-tramit-blue">
                          <Mail className="h-3 w-3" />{profile.email}
                        </a>
                      )}
                      {profile.phone && (
                        <a href={`tel:${profile.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-tramit-blue">
                          <Phone className="h-3 w-3" />{profile.phone}
                        </a>
                      )}
                    </div>
                  </div>
                  {/* Saldo ràpid */}
                  {(() => {
                    const bal = balances.find(b => b.user_id === profile.id && b.year === currentYear)
                    if (!bal) return null
                    const remaining = bal.total_days - bal.used_days
                    return (
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-tramit-blue">{remaining}</p>
                        <p className="text-[10px] text-muted-foreground">dies restants</p>
                      </div>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* TAB VACANCES */}
      {activeTab === 'vacances' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['', 'pending', 'approved', 'rejected'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filterStatus === s ? 'bg-tramit-blue text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}>
                {s === '' ? 'Totes' : STATUS_CONFIG[s]?.label}
                {s === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
              </button>
            ))}
          </div>
          {filteredVacances.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Umbrella className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Cap sol·licitud</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filteredVacances.map(req => {
                const p = req.profiles
                const color = p?.color || '#2272A3'
                const name = p?.full_name || '—'
                const isExpanded = expanded === req.id
                const isMyRequest = req.user_id === currentUserId

                return (
                  <Card key={req.id} className={req.status === 'pending' ? 'border-amber-200 dark:border-amber-800' : ''}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: color }}>
                          {getInitials(name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">{name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[req.status]?.style}`}>
                              {STATUS_CONFIG[req.status]?.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {req.start_date} → {req.end_date} · {req.working_days} dies laborables
                          </p>
                        </div>
                        {!isWorker && req.status === 'pending' && (
                          <button onClick={() => { setExpanded(isExpanded ? null : req.id); setAdminNote('') }}
                            className="text-muted-foreground hover:text-foreground p-1">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        )}
                      </div>

                      {isExpanded && !isWorker && req.status === 'pending' && (
                        <div className="mt-3 pt-3 border-t space-y-3">
                          {req.notes && (
                            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                              Nota del treballador: {req.notes}
                            </p>
                          )}
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Nota de l&apos;admin (opcional)</label>
                            <Input value={adminNote} onChange={e => setAdminNote(e.target.value)}
                              placeholder="Motiu de la decisió..." className="h-8 text-sm" />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="tramit"
                              onClick={() => handleApprove(req.id, 'approved')}
                              disabled={approving === req.id}>
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />Aprovar
                            </Button>
                            <Button size="sm" variant="outline"
                              onClick={() => handleApprove(req.id, 'rejected')}
                              disabled={approving === req.id}
                              className="text-red-600 hover:text-red-700 border-red-200">
                              <X className="h-3.5 w-3.5 mr-1" />Rebutjar
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB ABSÈNCIES */}
      {activeTab === 'absencies' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['', 'pending', 'approved', 'rejected'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filterStatus === s ? 'bg-tramit-blue text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}>
                {s === '' ? 'Totes' : STATUS_CONFIG[s]?.label}
              </button>
            ))}
          </div>
          {filteredAbs.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Cap absència registrada</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filteredAbs.map(req => {
                const p = req.profiles
                const name = p?.full_name || '—'
                const color = p?.color || '#64748b'
                return (
                  <Card key={req.id}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: color }}>
                          {getInitials(name)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">{name}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              {TYPE_LABELS[req.type] || req.type}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[req.status]?.style}`}>
                              {STATUS_CONFIG[req.status]?.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {req.start_date} → {req.end_date}
                          </p>
                        </div>
                        {!isWorker && req.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="tramit"
                              onClick={() => handleApprove(req.id, 'approved')}
                              disabled={approving === req.id}
                              className="h-7 px-2 text-xs">
                              Aprovar
                            </Button>
                            <Button size="sm" variant="outline"
                              onClick={() => handleApprove(req.id, 'rejected')}
                              disabled={approving === req.id}
                              className="h-7 px-2 text-xs text-red-600 border-red-200">
                              Rebutjar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB SALDOS */}
      {activeTab === 'saldos' && (
        <div className="space-y-3">
          {profiles.map(profile => {
            const bal = balances.find(b => b.user_id === profile.id && b.year === currentYear)
            const total = bal?.total_days || 0
            const used = bal?.used_days || 0
            const pending = bal?.pending_days || 0
            const remaining = total - used
            const pct = total > 0 ? Math.round((used / total) * 100) : 0
            const isEditing = editingBalance === profile.id

            return (
              <Card key={profile.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: profile.color || '#2272A3' }}>
                      {getInitials(profile.full_name)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{profile.full_name}</p>
                      <p className="text-xs text-muted-foreground">{ROLE_LABELS[profile.role]}</p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className="text-2xl font-bold text-tramit-blue">{remaining}</p>
                        <p className="text-[10px] text-muted-foreground">restants</p>
                      </div>
                      {!isWorker && (
                        isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={editBalanceValue}
                              onChange={e => setEditBalanceValue(e.target.value)}
                              className="h-8 w-16 text-sm text-center"
                              min="0" max="40"
                            />
                            <Button size="sm" variant="tramit"
                              onClick={() => handleSaveBalance(profile.id, currentYear)}
                              disabled={saving}
                              className="h-8 px-2">
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                            <button onClick={() => setEditingBalance(null)}
                              className="p-1.5 text-muted-foreground hover:text-foreground">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingBalance(profile.id); setEditBalanceValue(String(total)) }}
                            className="p-1.5 text-muted-foreground hover:text-tramit-blue hover:bg-tramit-blue-light rounded-md transition-colors"
                            title="Editar total de dies">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: profile.color || '#2272A3' }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Usats: <strong className="text-foreground">{used}</strong></span>
                    {pending > 0 && <span>Pendents: <strong className="text-amber-500">{pending}</strong></span>}
                    <span>Total: <strong className="text-foreground">{total}</strong></span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
