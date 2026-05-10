'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Plus, X, CheckCircle, Clock, AlertTriangle,
  Circle, ArrowRight, Calendar, User, Kanban,
  List, ChevronDown, ChevronUp, Pencil, Save
} from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'done' | 'archived'
  priority: 'normal' | 'high' | 'urgent'
  assigned_to: string | null
  client_id: string | null
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
  pending:    { label: 'Per fer',   icon: Circle,       style: 'text-slate-500',  bg: 'bg-slate-50 dark:bg-slate-800/50',       border: 'border-slate-200 dark:border-slate-700' },
  in_progress:{ label: 'En curs',  icon: ArrowRight,   style: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-900/20',       border: 'border-amber-200 dark:border-amber-800' },
  done:       { label: 'Completat', icon: CheckCircle,  style: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-900/20',       border: 'border-green-200 dark:border-green-800' },
}

const PRIORITY_CONFIG = {
  normal: { label: 'Normal', style: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  high:   { label: 'Alta',   style: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  urgent: { label: 'Urgent', style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

const QUICK_TEMPLATES = [
  { title: 'Preparar IRPF', priority: 'high' as const },
  { title: 'Tancament trimestral', priority: 'urgent' as const },
  { title: 'Revisar nòmines', priority: 'normal' as const },
  { title: 'Alta autònom', priority: 'normal' as const },
]

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
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks)
  const [form, setForm] = useState({
    title: '', description: '', priority: 'normal' as Task['priority'],
    assigned_to: '', client_id: '', due_date: '',
  })

  const supabase = createClient()

  const activeTasks = localTasks.filter(t => t.status !== 'archived')
  const pending = activeTasks.filter(t => t.status === 'pending')
  const inProgress = activeTasks.filter(t => t.status === 'in_progress')
  const done = activeTasks.filter(t => t.status === 'done')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('tasks').insert({
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      assigned_to: form.assigned_to || null,
      client_id: form.client_id || null,
      due_date: form.due_date || null,
      status: 'pending',
      created_by: currentUserId,
    }).select().single()
    setSaving(false)
    if (!error && data) {
      setLocalTasks(prev => [data, ...prev])
      setForm({ title: '', description: '', priority: 'normal', assigned_to: '', client_id: '', due_date: '' })
      setShowForm(false)
    }
  }

  async function moveTask(id: string, newStatus: Task['status']) {
    setMovingId(id)
    await supabase.from('tasks').update({
      status: newStatus,
      done_at: newStatus === 'done' ? new Date().toISOString() : null,
    }).eq('id', id)
    setLocalTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t))
    setMovingId(null)
  }

  function applyTemplate(tpl: typeof QUICK_TEMPLATES[0]) {
    setForm(f => ({ ...f, title: tpl.title, priority: tpl.priority }))
    setShowForm(true)
  }

  function TaskCard({ task }: { task: Task }) {
    const assignee = task.profiles
    const prioConf = PRIORITY_CONFIG[task.priority]
    const isExpanded = expandedId === task.id
    const nextStatus: Record<Task['status'], Task['status'] | null> = {
      pending: 'in_progress', in_progress: 'done', done: null, archived: null,
    }
    const prevStatus: Record<Task['status'], Task['status'] | null> = {
      pending: null, in_progress: 'pending', done: 'in_progress', archived: null,
    }
    const next = nextStatus[task.status]
    const prev = prevStatus[task.status]

    return (
      <div className="bg-background border border-border rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${prioConf.style}`}>
                {prioConf.label}
              </span>
              {task.clients && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {(task.clients as { name: string }).name}
                </span>
              )}
            </div>
            <p className={`text-sm font-medium leading-snug ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
              {task.title}
            </p>
            {task.due_date && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${
                new Date(task.due_date) < new Date() && task.status !== 'done'
                  ? 'text-red-500' : 'text-muted-foreground'
              }`}>
                <Calendar className="h-3 w-3" />
                {new Date(task.due_date).toLocaleDateString('ca-ES', { day: '2-digit', month: 'short' })}
              </p>
            )}
          </div>
          <button onClick={() => setExpandedId(isExpanded ? null : task.id)}
            className="text-muted-foreground hover:text-foreground p-0.5">
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        <div className="flex items-center justify-between mt-2">
          {assignee ? (
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                style={{ backgroundColor: (assignee as { color: string | null }).color || '#2272A3' }}>
                {getInitials((assignee as { full_name: string }).full_name)}
              </div>
              <span className="text-xs text-muted-foreground">{(assignee as { full_name: string }).full_name.split(' ')[0]}</span>
            </div>
          ) : <span />}
          <div className="flex gap-1">
            {prev && (
              <button onClick={() => moveTask(task.id, prev)}
                disabled={movingId === task.id}
                className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:text-foreground transition-colors">
                ←
              </button>
            )}
            {next && (
              <button onClick={() => moveTask(task.id, next)}
                disabled={movingId === task.id}
                className="text-xs px-1.5 py-0.5 rounded bg-tramit-blue-light text-tramit-blue dark:bg-blue-900/20 dark:text-blue-400 hover:bg-tramit-blue hover:text-white transition-colors font-medium">
                {next === 'in_progress' ? 'Iniciar' : 'Fet ✓'}
              </button>
            )}
          </div>
        </div>

        {isExpanded && task.description && (
          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">{task.description}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tasques</h1>
          <p className="text-muted-foreground mt-1">
            {pending.length} per fer · {inProgress.length} en curs · {done.length} completades
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            <button onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
              <Kanban className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button variant="tramit" size="sm" onClick={() => setShowForm(true)} className="flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Nova tasca
          </Button>
        </div>
      </div>

      {/* Plantilles ràpides */}
      {!showForm && (
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground self-center">Plantilles:</span>
          {QUICK_TEMPLATES.map(tpl => (
            <button key={tpl.title} onClick={() => applyTemplate(tpl)}
              className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-tramit-blue/50 transition-colors">
              {tpl.title}
            </button>
          ))}
        </div>
      )}

      {/* Formulari nova tasca */}
      {showForm && (
        <Card className="border-tramit-blue/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nova tasca</CardTitle>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Títol *</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Descripció de la tasca" required autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label>Prioritat</Label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Task['priority'] }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Data límit</Label>
                  <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Assignar a</Label>
                  <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="">Sense assignar</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Client relacionat</Label>
                  <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="">Sense client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Descripció (opcional)</Label>
                  <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Detalls addicionals..." />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="tramit" disabled={saving}>
                  {saving ? 'Desant...' : 'Crear tasca'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel·lar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* VISTA KANBAN */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([
            { key: 'pending' as const,     tasks: pending },
            { key: 'in_progress' as const, tasks: inProgress },
            { key: 'done' as const,        tasks: done },
          ] as const).map(col => {
            const conf = STATUS_CONFIG[col.key]
            const Icon = conf.icon
            return (
              <div key={col.key} className={`rounded-xl p-3 ${conf.bg} border ${conf.border}`}>
                <div className={`flex items-center gap-2 mb-3 ${conf.style}`}>
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-semibold">{conf.label}</span>
                  <span className="ml-auto text-xs font-bold opacity-60">{col.tasks.length}</span>
                </div>
                <div className="space-y-2">
                  {col.tasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4 opacity-60">Cap tasca</p>
                  ) : (
                    col.tasks.map(t => <TaskCard key={t.id} task={t} />)
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* VISTA LLISTA */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {activeTasks.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Cap tasca pendent</p>
            </CardContent></Card>
          ) : (
            activeTasks.map(task => {
              const conf = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
              const prioConf = PRIORITY_CONFIG[task.priority]
              const assignee = task.profiles
              return (
                <Card key={task.id}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center gap-3">
                      <div className={conf.style}><conf.icon className="h-4 w-4" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${prioConf.style}`}>
                            {prioConf.label}
                          </span>
                          {task.clients && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              {(task.clients as { name: string }).name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {assignee && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />{(assignee as { full_name: string }).full_name.split(' ')[0]}
                            </span>
                          )}
                          {task.due_date && (
                            <span className={`text-xs flex items-center gap-1 ${
                              new Date(task.due_date) < new Date() && task.status !== 'done' ? 'text-red-500' : 'text-muted-foreground'
                            }`}>
                              <Calendar className="h-3 w-3" />
                              {new Date(task.due_date).toLocaleDateString('ca-ES', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {task.status !== 'done' && (
                          <button onClick={() => moveTask(task.id, task.status === 'pending' ? 'in_progress' : 'done')}
                            disabled={movingId === task.id}
                            className="text-xs px-2 py-1 rounded-lg bg-tramit-blue-light text-tramit-blue hover:bg-tramit-blue hover:text-white transition-colors font-medium">
                            {task.status === 'pending' ? 'Iniciar' : 'Fet ✓'}
                          </button>
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
    </div>
  )
}
