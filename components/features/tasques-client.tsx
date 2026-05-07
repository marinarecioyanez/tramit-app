'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Plus, X, CheckCircle, Clock, AlertTriangle,
  Circle, ArrowRight, Calendar, User
} from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'done' | 'archived'
  priority: 'normal' | 'high' | 'urgent'
  assigned_to: string | null
  created_by: string
  due_date: string | null
  done_at: string | null
  created_at: string
  profiles?: { full_name: string; color: string | null } | null
  clients?: { name: string } | null
}

interface Profile { id: string; full_name: string; color: string | null }
interface Client { id: string; name: string }

const STATUS_CONFIG = {
  pending: {
    label: 'Pendent',
    icon: Circle,
    style: 'text-slate-500',
    bg: 'bg-slate-50 dark:bg-slate-800',
  },
  in_progress: {
    label: 'En curs',
    icon: ArrowRight,
    style: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  done: {
    label: 'Fet',
    icon: CheckCircle,
    style: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-900/20',
  },
  archived: {
    label: 'Arxivada',
    icon: Circle,
    style: 'text-muted-foreground',
    bg: 'bg-muted',
  },
}

const PRIORITY_CONFIG = {
  normal: { label: 'Normal', style: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  high: { label: 'Alta', style: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  urgent: { label: 'Urgent', style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function TasquesClient({
  tasks,
  profiles,
  clients,
  currentUserId,
}: {
  tasks: Task[]
  profiles: Profile[]
  clients: Client[]
  currentUserId: string
}) {
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'mine' | 'pending' | 'done'>('all')
  const [showArchived, setShowArchived] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'normal',
    assigned_to: currentUserId,
    client_id: '',
    due_date: '',
  })

  const supabase = createClient()

  const filtered = tasks.filter(t => {
    if (t.status === 'archived' && !showArchived) return false
    if (filter === 'mine') return t.assigned_to === currentUserId || t.created_by === currentUserId
    if (filter === 'pending') return t.status !== 'done' && t.status !== 'archived'
    if (filter === 'done') return t.status === 'done'
    return true
  })

  const pendingCount = tasks.filter(t =>
    t.status !== 'done' && t.status !== 'archived' && t.assigned_to === currentUserId
  ).length

  const archivedCount = tasks.filter(t => t.status === 'archived').length

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await supabase.from('tasks').insert({
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        assigned_to: form.assigned_to || null,
        client_id: form.client_id || null,
        due_date: form.due_date || null,
        created_by: currentUserId,
        status: 'pending',
      })

      if (form.assigned_to && form.assigned_to !== currentUserId) {
        await supabase.from('notifications').insert({
          user_id: form.assigned_to,
          title: 'Nova tasca assignada',
          body: `T'han assignat la tasca: "${form.title}"`,
          type: 'task',
          read: false,
        })
      }

      setForm({
        title: '',
        description: '',
        priority: 'normal',
        assigned_to: currentUserId,
        client_id: '',
        due_date: '',
      })
      setShowForm(false)
      window.location.reload()
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(taskId: string, newStatus: 'pending' | 'in_progress' | 'done' | 'archived') {
    setLoading(taskId)
    await supabase
      .from('tasks')
      .update({
        status: newStatus,
        done_at: newStatus === 'done' ? new Date().toISOString() : null,
      })
      .eq('id', taskId)
    setLoading(null)
    window.location.reload()
  }

  const columns: { status: 'pending' | 'in_progress' | 'done' }[] = [
    { status: 'pending' },
    { status: 'in_progress' },
    { status: 'done' },
  ]

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Capçalera */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tasques</h1>
          <p className="text-muted-foreground mt-1">
            Gestió de tasques de l&apos;equip
            {pendingCount > 0 && (
              <span className="ml-2 text-amber-600 font-medium">
                · {pendingCount} assignades a tu
              </span>
            )}
          </p>
        </div>
        <Button
          variant="tramit"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova tasca
        </Button>
      </div>

      {/* Formulari */}
      {showForm && (
        <Card className="border-tramit-blue/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nova tasca</CardTitle>
              <button
                onClick={() => setShowForm(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Títol *</Label>
                <Input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Descriu la tasca..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Assignar a</Label>
                  <select
                    value={form.assigned_to}
                    onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}{p.id === currentUserId ? ' (jo)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>Prioritat</Label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>Client relacionat</Label>
                  <select
                    value={form.client_id}
                    onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Sense client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>Data límit</Label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Descripció <span className="text-muted-foreground">(opcional)</span></Label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Afegeix més detalls..."
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" variant="tramit" disabled={saving}>
                  {saving ? 'Creant...' : 'Crear tasca'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel·lar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: 'all', label: 'Totes' },
          { id: 'mine', label: 'Les meves' },
          { id: 'pending', label: 'Pendents' },
          { id: 'done', label: 'Fetes' },
        ] as const).map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === f.id
                ? 'bg-tramit-blue text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
            showArchived
              ? 'bg-muted text-foreground border-muted'
              : 'border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground'
          }`}
        >
          📁 {showArchived ? 'Amagar arxivades' : `Arxivades${archivedCount > 0 ? ` (${archivedCount})` : ''}`}
        </button>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map(col => {
          const config = STATUS_CONFIG[col.status]
          const Icon = config.icon
          const colTasks = filtered.filter(t => t.status === col.status)

          return (
            <div key={col.status} className="space-y-3">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bg}`}>
                <Icon className={`h-4 w-4 ${config.style}`} />
                <span className="text-sm font-semibold">{config.label}</span>
                <span className="ml-auto text-xs font-bold text-muted-foreground">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-2 min-h-[100px]">
                {colTasks.map(task => {
                  const assignedProfile = task.profiles as { full_name: string; color: string | null } | null
                  const clientName = (task.clients as { name: string } | null)?.name
                  const isOverdue = task.due_date &&
                    task.status !== 'done' &&
                    task.status !== 'archived' &&
                    task.due_date < new Date().toISOString().split('T')[0]
                  const daysUntilDue = task.due_date
                    ? Math.ceil((new Date(task.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                    : null

                  return (
                    <Card
                      key={task.id}
                      className={`${isOverdue ? 'border-red-300 dark:border-red-800' : ''} ${loading === task.id ? 'opacity-50' : ''}`}
                    >
                      <CardContent className="pt-3 pb-3 px-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium leading-tight ${
                              task.status === 'done' ? 'line-through text-muted-foreground' : ''
                            }`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${PRIORITY_CONFIG[task.priority].style}`}>
                            {PRIORITY_CONFIG[task.priority].label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {assignedProfile && (
                            <div className="flex items-center gap-1">
                              <div
                                className="h-5 w-5 rounded-full flex items-center justify-center text-white shrink-0"
                                style={{
                                  backgroundColor: assignedProfile.color || '#2272A3',
                                  fontSize: '8px',
                                  fontWeight: 700,
                                }}
                              >
                                {getInitials(assignedProfile.full_name)}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {assignedProfile.full_name.split(' ')[0]}
                              </span>
                            </div>
                          )}
                          {clientName && (
                            <span className="text-xs text-muted-foreground">· {clientName}</span>
                          )}
                          {task.due_date && (
                            <div className={`flex items-center gap-1 ml-auto ${
                              isOverdue
                                ? 'text-red-500'
                                : daysUntilDue !== null && daysUntilDue <= 2
                                ? 'text-amber-500'
                                : 'text-muted-foreground'
                            }`}>
                              <Calendar className="h-3 w-3" />
                              <span className="text-xs">
                                {isOverdue
                                  ? 'Vençuda'
                                  : daysUntilDue === 0
                                  ? 'Avui'
                                  : daysUntilDue === 1
                                  ? 'Demà'
                                  : task.due_date}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Botons d'estat */}
                        <div className="flex gap-1 pt-1 border-t border-border flex-wrap">
                          {(['pending', 'in_progress', 'done'] as const).map(s => (
                            <button
                              key={s}
                              onClick={() => changeStatus(task.id, s)}
                              disabled={task.status === s || loading === task.id}
                              className={`flex-1 py-1 rounded text-xs font-medium transition-all ${
                                task.status === s
                                  ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].style} cursor-default`
                                  : 'text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              {STATUS_CONFIG[s].label}
                            </button>
                          ))}
                          <button
                            onClick={() => changeStatus(
                              task.id,
                              task.status === 'archived' ? 'pending' : 'archived'
                            )}
                            disabled={loading === task.id}
                            title={task.status === 'archived' ? 'Desarxivar' : 'Arxivar'}
                            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                              task.status === 'archived'
                                ? 'bg-tramit-blue text-white'
                                : 'text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {task.status === 'archived' ? '↩' : '📁'}
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}

                {colTasks.length === 0 && (
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-muted-foreground">
                    <p className="text-xs">Cap tasca</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Tasques arxivades */}
      {showArchived && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
            <span className="text-sm font-semibold text-muted-foreground">📁 Arxivades</span>
            <span className="ml-auto text-xs font-bold text-muted-foreground">
              {filtered.filter(t => t.status === 'archived').length}
            </span>
          </div>
          <div className="space-y-2">
            {filtered.filter(t => t.status === 'archived').map(task => {
              const assignedProfile = task.profiles as { full_name: string; color: string | null } | null
              const clientName = (task.clients as { name: string } | null)?.name

              return (
                <Card key={task.id} className="opacity-60">
                  <CardContent className="pt-3 pb-3 px-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-through text-muted-foreground truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {assignedProfile && (
                            <span className="text-xs text-muted-foreground">
                              {assignedProfile.full_name.split(' ')[0]}
                            </span>
                          )}
                          {clientName && (
                            <span className="text-xs text-muted-foreground">· {clientName}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => changeStatus(task.id, 'pending')}
                        disabled={loading === task.id}
                        className="text-xs text-tramit-blue hover:underline shrink-0"
                      >
                        Desarxivar
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {filtered.filter(t => t.status === 'archived').length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Cap tasca arxivada
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
