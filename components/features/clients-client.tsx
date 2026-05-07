'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Plus, X, Search, User, Building2, Phone, Mail,
  FileText, CheckCircle, AlertTriangle, Pencil,
  ChevronDown, ChevronUp, Tag, TrendingUp,
  Clock, Star, AlertCircle, MoreHorizontal,
  MessageSquare, Calendar
} from 'lucide-react'
import Link from 'next/link'

interface Client {
  id: string
  name: string
  company: string | null
  phone: string | null
  email: string | null
  nif_cif: string | null
  notes: string | null
  responsible_id: string | null
  origin: string
  status: string
  pipeline_stage: string | null
  estimated_value: number | null
  last_contact_at: string | null
  tags: string[]
  client_type: string
  address: string | null
  city: string | null
  created_at: string
  profiles?: { full_name: string; color: string | null } | null
}

interface Profile {
  id: string
  full_name: string
  color: string | null
}

const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  prospect: { label: 'Prospecte', style: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  lead: { label: 'Lead', style: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  active: { label: 'Actiu', style: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  inactive: { label: 'Inactiu', style: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  blocked: { label: 'Bloquejat', style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

const PIPELINE_CONFIG: Record<string, { label: string; step: number }> = {
  new: { label: 'Nou', step: 1 },
  contacted: { label: 'Contactat', step: 2 },
  proposal: { label: 'Proposta', step: 3 },
  negotiation: { label: 'Negociació', step: 4 },
  closed_won: { label: 'Tancat ✓', step: 5 },
  closed_lost: { label: 'Perdut', step: 0 },
}

const CLIENT_TYPE_LABELS: Record<string, string> = {
  particular: 'Particular',
  autonomo: 'Autònom',
  empresa: 'Empresa',
  asociacion: 'Associació',
}

const ORIGIN_LABELS: Record<string, string> = {
  appointment: 'Des d\'una cita',
  manual: 'Alta manual',
  other: 'Altre',
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

export function ClientsClient({
  clients,
  profiles,
}: {
  clients: Client[]
  profiles: Profile[]
}) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterResponsible, setFilterResponsible] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')

  const [form, setForm] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    nif_cif: '',
    notes: '',
    responsible_id: '',
    status: 'active',
    client_type: 'particular',
    pipeline_stage: 'new',
    estimated_value: '',
    address: '',
    city: '',
    postal_code: '',
    tags: [] as string[],
  })

  const supabase = createClient()

  const filtered = useMemo(() => {
    let result = clients
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.nif_cif?.toLowerCase().includes(q) ||
        c.tags?.some(t => t.toLowerCase().includes(q))
      )
    }
    if (filterStatus) result = result.filter(c => c.status === filterStatus)
    if (filterType) result = result.filter(c => c.client_type === filterType)
    if (filterResponsible) result = result.filter(c => c.responsible_id === filterResponsible)
    return result
  }, [clients, search, filterStatus, filterType, filterResponsible])

  const stats = useMemo(() => ({
    total: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    prospects: clients.filter(c => c.status === 'prospect' || c.status === 'lead').length,
    inactive: clients.filter(c => c.status === 'inactive').length,
    noContact: clients.filter(c => {
      const days = daysSince(c.last_contact_at)
      return days !== null && days > 90
    }).length,
  }), [clients])

  function resetForm() {
    setForm({
      name: '', company: '', phone: '', email: '', nif_cif: '', notes: '',
      responsible_id: '', status: 'active', client_type: 'particular',
      pipeline_stage: 'new', estimated_value: '', address: '', city: '',
      postal_code: '', tags: [],
    })
    setEditingId(null)
    setShowForm(false)
    setError(null)
    setTagInput('')
  }

  function startEdit(client: Client) {
    setEditingId(client.id)
    setForm({
      name: client.name,
      company: client.company || '',
      phone: client.phone || '',
      email: client.email || '',
      nif_cif: client.nif_cif || '',
      notes: client.notes || '',
      responsible_id: client.responsible_id || '',
      status: client.status,
      client_type: client.client_type,
      pipeline_stage: client.pipeline_stage || 'new',
      estimated_value: client.estimated_value?.toString() || '',
      address: client.address || '',
      city: client.city || '',
      postal_code: '',
      tags: client.tags || [],
    })
    setShowForm(true)
    setError(null)
  }

  function addTag() {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm(f => ({ ...f, tags: [...f.tags, tagInput.trim()] }))
      setTagInput('')
    }
  }

  function removeTag(tag: string) {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) {
      setError('El nom és obligatori.')
      return
    }
    setLoading(true)
    try {
      const payload = {
        name: form.name,
        company: form.company || null,
        phone: form.phone || null,
        email: form.email || null,
        nif_cif: form.nif_cif || null,
        notes: form.notes || null,
        responsible_id: form.responsible_id || null,
        status: form.status,
        client_type: form.client_type,
        pipeline_stage: form.pipeline_stage || null,
        estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
        address: form.address || null,
        city: form.city || null,
        tags: form.tags,
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from('clients').update(payload).eq('id', editingId)
        if (updateError) throw updateError

        // Registrar activitat
        await supabase.from('client_activity').insert({
          client_id: editingId,
          type: 'other',
          title: 'Fitxa actualitzada',
        })

        setSuccess('Client actualitzat correctament')
      } else {
        // Verificar duplicats
        if (form.email) {
          const { data: existing } = await supabase
            .from('clients').select('id').eq('email', form.email).single()
          if (existing) { setError('Ja existeix un client amb aquest email.'); setLoading(false); return }
        }
        if (form.nif_cif) {
          const { data: existing } = await supabase
            .from('clients').select('id').eq('nif_cif', form.nif_cif).single()
          if (existing) { setError('Ja existeix un client amb aquest NIF/CIF.'); setLoading(false); return }
        }

        const { data: newClient, error: insertError } = await supabase
          .from('clients').insert({ ...payload, origin: 'manual' }).select().single()
        if (insertError) throw insertError

        // Activitat inicial
        await supabase.from('client_activity').insert({
          client_id: newClient.id,
          type: 'other',
          title: 'Client creat',
          body: `Alta manual per ${form.responsible_id ? 'treballador assignat' : 'administrador'}`,
        })

        setSuccess('Client creat correctament')
      }

      resetForm()
      setTimeout(() => { setSuccess(null); window.location.reload() }, 1500)
    } catch {
      setError("S'ha produït un error. Torna-ho a intentar.")
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(clientId: string, newStatus: string) {
    await supabase.from('clients').update({ status: newStatus }).eq('id', clientId)
    await supabase.from('client_activity').insert({
      client_id: clientId,
      type: 'status_change',
      title: `Estat canviat a: ${STATUS_CONFIG[newStatus]?.label || newStatus}`,
    })
    window.location.reload()
  }

  const pipelineStages = ['new', 'contacted', 'proposal', 'negotiation', 'closed_won']

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Capçalera */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground mt-1">{clients.length} clients registrats</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            {(['list', 'kanban'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === mode ? 'bg-background shadow-sm' : 'text-muted-foreground'
                }`}
              >
                {mode === 'list' ? 'Llista' : 'Pipeline'}
              </button>
            ))}
          </div>
          {!showForm && (
            <Button variant="tramit" onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nou client
            </Button>
          )}
        </div>
      </div>

      {/* Estadístiques */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground' },
          { label: 'Actius', value: stats.active, color: 'text-green-600' },
          { label: 'Prospects/Leads', value: stats.prospects, color: 'text-blue-600' },
          { label: 'Inactius', value: stats.inactive, color: 'text-amber-600' },
          { label: 'Sense contacte +90d', value: stats.noContact, color: 'text-red-500' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-3 pb-3 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 px-4 py-3 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">{success}</p>
        </div>
      )}

      {/* Formulari */}
      {showForm && (
        <Card className="border-tramit-blue/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{editingId ? 'Editar client' : 'Nou client'}</CardTitle>
              <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nom *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom del client" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Empresa</Label>
                  <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Nom de l'empresa" />
                </div>
                <div className="space-y-1.5">
                  <Label>Telèfon</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="600 000 000" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="client@exemple.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>NIF / CIF</Label>
                  <Input value={form.nif_cif} onChange={e => setForm(f => ({ ...f, nif_cif: e.target.value }))} placeholder="12345678A" />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipus</Label>
                  <select value={form.client_type} onChange={e => setForm(f => ({ ...f, client_type: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {Object.entries(CLIENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Estat</Label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Etapa pipeline</Label>
                  <select value={form.pipeline_stage} onChange={e => setForm(f => ({ ...f, pipeline_stage: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {Object.entries(PIPELINE_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Valor estimat (€)</Label>
                  <Input type="number" value={form.estimated_value} onChange={e => setForm(f => ({ ...f, estimated_value: e.target.value }))} placeholder="0.00" min="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Responsable intern</Label>
                  <select value={form.responsible_id} onChange={e => setForm(f => ({ ...f, responsible_id: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="">Sense assignar</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Adreça</Label>
                  <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Carrer, número..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Població</Label>
                  <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Girona" />
                </div>
              </div>

              {/* Etiquetes */}
              <div className="space-y-1.5">
                <Label>Etiquetes</Label>
                <div className="flex gap-2">
                  <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                    placeholder="Afegir etiqueta i prémer Enter" />
                  <Button type="button" variant="outline" onClick={addTag} size="sm">Afegir</Button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {form.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 bg-tramit-blue-light dark:bg-blue-900/20 text-tramit-blue text-xs px-2 py-1 rounded-full">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Notes internes..." rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />{error}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" variant="tramit" disabled={loading}>
                  {loading ? 'Desant...' : editingId ? 'Desar canvis' : 'Crear client'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel·lar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Cerca i filtres */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cercar per nom, empresa, email, telèfon, NIF o etiqueta..."
            value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">Tots els estats</option>
            {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">Tots els tipus</option>
            {Object.entries(CLIENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filterResponsible} onChange={e => setFilterResponsible(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">Tots els responsables</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
          {(filterStatus || filterType || filterResponsible) && (
            <button onClick={() => { setFilterStatus(''); setFilterType(''); setFilterResponsible('') }}
              className="text-xs text-tramit-blue hover:underline">
              Netejar filtres
            </button>
          )}
          <span className="text-xs text-muted-foreground self-center ml-auto">
            {filtered.length} de {clients.length} clients
          </span>
        </div>
      </div>

      {/* Vista Pipeline (Kanban) */}
      {viewMode === 'kanban' && (
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-[900px] pb-4">
            {pipelineStages.map(stage => {
              const stageClients = filtered.filter(c => c.pipeline_stage === stage)
              const config = PIPELINE_CONFIG[stage]
              const totalValue = stageClients.reduce((sum, c) => sum + (c.estimated_value || 0), 0)

              return (
                <div key={stage} className="flex-1 min-w-[160px] space-y-3">
                  <div className="bg-muted px-3 py-2 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">{config.label}</p>
                      <span className="text-xs text-muted-foreground">{stageClients.length}</span>
                    </div>
                    {totalValue > 0 && (
                      <p className="text-xs text-tramit-blue font-medium mt-0.5">
                        {totalValue.toLocaleString('ca-ES')}€
                      </p>
                    )}
                  </div>
                  <div className="space-y-2 min-h-[200px]">
                    {stageClients.map(client => (
                      <Card key={client.id} className="cursor-pointer hover:border-tramit-blue/30 transition-colors">
                        <CardContent className="pt-3 pb-3 px-3">
                          <p className="text-xs font-semibold truncate">{client.name}</p>
                          {client.company && <p className="text-[10px] text-muted-foreground truncate">{client.company}</p>}
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_CONFIG[client.status]?.style}`}>
                              {STATUS_CONFIG[client.status]?.label}
                            </span>
                            {client.estimated_value && (
                              <span className="text-[10px] font-medium text-tramit-blue">
                                {client.estimated_value.toLocaleString('ca-ES')}€
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {stageClients.length === 0 && (
                      <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                        <p className="text-xs text-muted-foreground">Cap client</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Vista Llista */}
      {viewMode === 'list' && (
        <>
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>{search ? 'Cap client coincideix amb la cerca' : 'Encara no hi ha clients registrats'}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map(client => {
                const isExpanded = expanded === client.id
                const responsibleName = (client.profiles as { full_name: string } | null)?.full_name
                const responsibleColor = (client.profiles as { full_name: string; color: string | null } | null)?.color
                const daysSinceContact = daysSince(client.last_contact_at)
                const isStale = daysSinceContact !== null && daysSinceContact > 90

                return (
                  <Card key={client.id} className={`overflow-hidden transition-colors ${isStale ? 'border-amber-200 dark:border-amber-800' : ''}`}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="h-10 w-10 rounded-full bg-tramit-blue-light dark:bg-blue-900/30 flex items-center justify-center shrink-0 text-tramit-blue font-bold text-sm">
                          {getInitials(client.name)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Link href={`/dashboard/clients/${client.id}`}>
                                  <p className="font-semibold text-sm hover:text-tramit-blue transition-colors cursor-pointer">{client.name}</p>
                                </Link>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[client.status]?.style}`}>
                                  {STATUS_CONFIG[client.status]?.label}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                  {CLIENT_TYPE_LABELS[client.client_type]}
                                </span>
                                {isStale && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {daysSinceContact}d sense contacte
                                  </span>
                                )}
                              </div>
                              {client.company && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Building2 className="h-3 w-3" />{client.company}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => startEdit(client)}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => setExpanded(isExpanded ? null : client.id)}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* Info compacta */}
                          <div className="flex flex-wrap gap-3 mt-1.5">
                            {client.phone && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />{client.phone}
                              </span>
                            )}
                            {client.email && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />{client.email}
                              </span>
                            )}
                            {client.nif_cif && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <FileText className="h-3 w-3" />{client.nif_cif}
                              </span>
                            )}
                            {responsibleName && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" />{responsibleName}
                              </span>
                            )}
                            {client.estimated_value && (
                              <span className="text-xs font-medium text-tramit-blue flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />{client.estimated_value.toLocaleString('ca-ES')}€
                              </span>
                            )}
                          </div>

                          {/* Etiquetes */}
                          {client.tags && client.tags.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap mt-2">
                              {client.tags.map(tag => (
                                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-tramit-blue-light dark:bg-blue-900/20 text-tramit-blue">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Detall expandit */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Origen</p>
                              <p>{ORIGIN_LABELS[client.origin] || client.origin}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Alta</p>
                              <p>{new Date(client.created_at).toLocaleDateString('ca-ES')}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Últim contacte</p>
                              <p>{client.last_contact_at
                                ? `Fa ${daysSinceContact} dies`
                                : 'Mai'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Pipeline</p>
                              <p>{PIPELINE_CONFIG[client.pipeline_stage || 'new']?.label || '—'}</p>
                            </div>
                          </div>

                          {client.notes && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">{client.notes}</p>
                            </div>
                          )}

                          {/* Canviar estat ràpid */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Canviar estat</p>
                            <div className="flex gap-1.5 flex-wrap">
                              {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                                <button key={v} onClick={() => updateStatus(client.id, v)}
                                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                                    client.status === v
                                      ? c.style + ' ring-2 ring-offset-1 ring-tramit-blue'
                                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                  }`}>
                                  {c.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Accions ràpides */}
                          <div className="flex gap-2">
                            <Link href={`/dashboard/clients/${client.id}`}>
                              <Button size="sm" variant="tramit" className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />
                                Veure fitxa completa
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
