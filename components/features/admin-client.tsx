'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Users, Settings, Shield, Plus, X,
  CheckCircle, AlertTriangle, Pencil, Eye, EyeOff,
  ChevronDown, ChevronUp
} from 'lucide-react'

interface ProfileData {
  id: string
  full_name: string
  email: string
  role: string
  phone: string | null
  color: string | null
  active: boolean
}

interface Setting {
  key: string
  value: string
  description: string | null
  category: string | null
}

interface Holiday {
  id: string
  date: string
  name: string
  year: number
}

interface Closure {
  id: string
  date: string
  name: string
  year: number
  deducts_vacation: boolean
}

interface AuditLog {
  id: string
  action: string
  entity_type: string | null
  created_at: string
  profiles?: { full_name: string } | null
  new_values?: Record<string, unknown> | null
  old_values?: Record<string, unknown> | null
}

const PRESET_COLORS = [
  '#2272A3', '#1A5F8A', '#E74C3C', '#2ECC71',
  '#9B59B6', '#F39C12', '#1ABC9C', '#E91E63',
  '#FF5722', '#607D8B',
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administradora',
  supervisor: 'Supervisor',
  worker: 'Treballador/a',
}

type TabId = 'usuaris' | 'configuracio' | 'auditoria'

export function AdminClient({
  profiles,
  settings,
  holidays,
  closures,
  auditLogs,
}: {
  profiles: ProfileData[]
  settings: Setting[]
  holidays: Holiday[]
  closures: Closure[]
  auditLogs: AuditLog[]
}) {
  const [activeTab, setActiveTab] = useState<TabId>('usuaris')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUser, setEditingUser] = useState<ProfileData | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [auditFilter, setAuditFilter] = useState('')

  const [userForm, setUserForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'worker',
    phone: '',
    color: '#2272A3',
  })

  const supabase = createClient()

  function showMsg(msg: string, isError = false) {
    if (isError) { setError(msg); setTimeout(() => setError(null), 4000) }
    else { setSuccess(msg); setTimeout(() => setSuccess(null), 3000) }
  }

  function resetUserForm() {
    setUserForm({ full_name: '', email: '', password: '', role: 'worker', phone: '', color: '#2272A3' })
    setShowCreateForm(false)
    setEditingUser(null)
    setError(null)
  }

  function startEdit(profile: ProfileData) {
    setEditingUser(profile)
    setUserForm({
      full_name: profile.full_name,
      email: profile.email,
      password: '',
      role: profile.role,
      phone: profile.phone || '',
      color: profile.color || '#2272A3',
    })
    setShowCreateForm(true)
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!userForm.full_name || !userForm.email) { showMsg('Nom i email són obligatoris', true); return }
    if (!editingUser && !userForm.password) { showMsg('Cal introduir una contrasenya', true); return }
    setSaving(true)
    try {
      if (editingUser) {
        await supabase.from('profiles').update({
          full_name: userForm.full_name,
          role: userForm.role,
          phone: userForm.phone || null,
          color: userForm.color,
        }).eq('id', editingUser.id)
        if (userForm.password) {
          await fetch('/api/admin/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: editingUser.id, password: userForm.password }),
          })
        }
        showMsg('Usuari actualitzat correctament')
      } else {
        const res = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userForm),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        showMsg('Usuari creat correctament')
      }
      resetUserForm()
      setTimeout(() => window.location.reload(), 1000)
    } catch (err) {
      showMsg(err instanceof Error ? err.message : 'Error desconegut', true)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(profile: ProfileData) {
    await supabase.from('profiles').update({ active: !profile.active }).eq('id', profile.id)
    window.location.reload()
  }

  const filteredLogs = auditFilter
    ? auditLogs.filter(l =>
        l.action.toLowerCase().includes(auditFilter.toLowerCase()) ||
        l.entity_type?.toLowerCase().includes(auditFilter.toLowerCase()) ||
        (l.profiles as { full_name: string } | null)?.full_name.toLowerCase().includes(auditFilter.toLowerCase())
      )
    : auditLogs

  const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'usuaris', label: 'Usuaris', icon: Users },
    { id: 'configuracio', label: 'Configuració', icon: Settings },
    { id: 'auditoria', label: 'Auditoria', icon: Shield },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Administració</h1>
        <p className="text-muted-foreground mt-1">Usuaris, configuració i auditoria</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 px-4 py-3 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 px-4 py-3 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab: Usuaris ──────────────────────────────────────── */}
      {activeTab === 'usuaris' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {!showCreateForm && (
              <Button variant="tramit" onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nou usuari
              </Button>
            )}
          </div>

          {showCreateForm && (
            <Card className="border-tramit-blue/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {editingUser ? `Editar ${editingUser.full_name}` : 'Nou usuari'}
                  </CardTitle>
                  <button onClick={resetUserForm} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Nom complet *</Label>
                      <Input value={userForm.full_name} onChange={e => setUserForm(f => ({ ...f, full_name: e.target.value }))} required placeholder="Nom i cognoms" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email *</Label>
                      <Input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} required disabled={!!editingUser} placeholder="email@tramiteconomistes.com" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{editingUser ? 'Nova contrasenya (opcional)' : 'Contrasenya *'}</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={userForm.password}
                          onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                          placeholder={editingUser ? 'Deixa en blanc per no canviar' : 'Mínim 6 caràcters'}
                          required={!editingUser}
                          minLength={editingUser ? 0 : 6}
                          className="pr-10"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Rol</Label>
                      <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Telèfon</Label>
                      <Input value={userForm.phone} onChange={e => setUserForm(f => ({ ...f, phone: e.target.value }))} placeholder="600 000 000" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Color al calendari</Label>
                      <div className="flex gap-2 flex-wrap">
                        {PRESET_COLORS.map(c => (
                          <button key={c} type="button" onClick={() => setUserForm(f => ({ ...f, color: c }))}
                            className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                            style={{ backgroundColor: c, outline: userForm.color === c ? '3px solid #1A5F8A' : 'none', outlineOffset: '2px' }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" variant="tramit" disabled={saving}>
                      {saving ? 'Desant...' : editingUser ? 'Desar canvis' : 'Crear usuari'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetUserForm}>Cancel·lar</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {profiles.map(profile => (
              <Card key={profile.id} className={!profile.active ? 'opacity-60' : ''}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-4">
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: profile.color || '#2272A3' }}
                    >
                      {profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{profile.full_name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {ROLE_LABELS[profile.role] || profile.role}
                        </span>
                        {!profile.active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Inactiu</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{profile.email}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => startEdit(profile)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => toggleActive(profile)}
                        className={`p-1.5 rounded-md transition-colors text-xs font-medium px-2 ${
                          profile.active
                            ? 'text-muted-foreground hover:text-red-600 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}>
                        {profile.active ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Configuració ─────────────────────────────────── */}
      {activeTab === 'configuracio' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {['general', 'security', 'vacation'].map(category => {
              const catSettings = settings.filter(s => s.category === category)
              if (catSettings.length === 0) return null
              const catLabels: Record<string, string> = {
                general: 'General',
                security: 'Seguretat',
                vacation: 'Vacances',
              }
              return (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{catLabels[category] || category}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {catSettings.map(setting => (
                      <div key={setting.key} className="flex items-start justify-between gap-4 p-3 bg-muted/30 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{setting.key}</p>
                          {setting.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
                          )}
                        </div>
                        <div className="shrink-0">
                          <Input
                            defaultValue={setting.value}
                            className="w-24 h-8 text-sm text-right"
                            onBlur={async e => {
                              if (e.target.value !== setting.value) {
                                await supabase.from('settings')
                                  .update({ value: e.target.value })
                                  .eq('key', setting.key)
                                showMsg('Configuració actualitzada')
                              }
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            })}

            {/* Festius */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Festius configurats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {holidays.slice(0, 10).map(h => (
                    <div key={h.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                      <span className="font-medium">{h.name}</span>
                      <span className="text-muted-foreground">{h.date}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tancaments */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tancaments d&apos;empresa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {closures.map(c => (
                    <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                      <span className="font-medium">{c.name || c.date}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {c.deducts_vacation ? 'Descompten vacances' : 'No descompten'}
                        </span>
                        <span className="text-muted-foreground">{c.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Tab: Auditoria ────────────────────────────────────── */}
      {activeTab === 'auditoria' && (
        <div className="space-y-4">
          <Input
            placeholder="Filtrar per acció, entitat o usuari..."
            value={auditFilter}
            onChange={e => setAuditFilter(e.target.value)}
          />
          <div className="space-y-2">
            {filteredLogs.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Cap registre d&apos;auditoria</p>
                </CardContent>
              </Card>
            ) : (
              filteredLogs.map(log => {
                const isExpanded = expandedLog === log.id
                const userName = (log.profiles as { full_name: string } | null)?.full_name || 'Sistema'
                return (
                  <Card key={log.id}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{log.action}</p>
                            {log.entity_type && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {log.entity_type}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {userName} · {new Date(log.created_at).toLocaleString('ca-ES')}
                          </p>
                        </div>
                        {(log.new_values || log.old_values) && (
                          <button
                            onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                            className="text-muted-foreground hover:text-foreground shrink-0"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          {log.old_values && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Valor anterior:</p>
                              <pre className="text-xs bg-muted/50 rounded-lg p-2 overflow-auto">
                                {JSON.stringify(log.old_values, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.new_values && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Valor nou:</p>
                              <pre className="text-xs bg-muted/50 rounded-lg p-2 overflow-auto">
                                {JSON.stringify(log.new_values, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
