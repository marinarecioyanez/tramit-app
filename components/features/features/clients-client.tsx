'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Plus, X, Search, User, Building2, Phone, Mail,
  FileText, CheckCircle, AlertTriangle, Pencil, ChevronDown, ChevronUp
} from 'lucide-react'

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
  created_at: string
  profiles?: { full_name: string } | null
}

interface Profile {
  id: string
  full_name: string
}

const ORIGIN_LABELS: Record<string, string> = {
  appointment: 'Des d\'una cita',
  manual: 'Alta manual',
  other: 'Altre',
}

export function ClientsClient({ clients, profiles }: { clients: Client[]; profiles: Profile[] }) {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    nif_cif: '',
    notes: '',
    responsible_id: '',
  })

  const supabase = createClient()

  const filtered = useMemo(() => {
    if (!search) return clients
    const q = search.toLowerCase()
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.nif_cif?.toLowerCase().includes(q)
    )
  }, [clients, search])

  function resetForm() {
    setForm({ name: '', company: '', phone: '', email: '', nif_cif: '', notes: '', responsible_id: '' })
    setEditingId(null)
    setShowForm(false)
    setError(null)
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
    })
    setShowForm(true)
    setError(null)
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
      if (editingId) {
        const { error: updateError } = await supabase
          .from('clients')
          .update({
            name: form.name,
            company: form.company || null,
            phone: form.phone || null,
            email: form.email || null,
            nif_cif: form.nif_cif || null,
            notes: form.notes || null,
            responsible_id: form.responsible_id || null,
          })
          .eq('id', editingId)

        if (updateError) throw updateError
        setSuccess('Client actualitzat correctament')
      } else {
        // Comprovar duplicats
        if (form.email) {
          const { data: existing } = await supabase
            .from('clients')
            .select('id')
            .eq('email', form.email)
            .single()
          if (existing) {
            setError('Ja existeix un client amb aquest email.')
            setLoading(false)
            return
          }
        }

        if (form.nif_cif) {
          const { data: existing } = await supabase
            .from('clients')
            .select('id')
            .eq('nif_cif', form.nif_cif)
            .single()
          if (existing) {
            setError('Ja existeix un client amb aquest NIF/CIF.')
            setLoading(false)
            return
          }
        }

        const { error: insertError } = await supabase
          .from('clients')
          .insert({
            name: form.name,
            company: form.company || null,
            phone: form.phone || null,
            email: form.email || null,
            nif_cif: form.nif_cif || null,
            notes: form.notes || null,
            responsible_id: form.responsible_id || null,
            origin: 'manual',
          })

        if (insertError) throw insertError
        setSuccess('Client creat correctament')
      }

      resetForm()
      setTimeout(() => {
        setSuccess(null)
        window.location.reload()
      }, 1500)
    } catch {
      setError("S'ha produït un error. Torna-ho a intentar.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground mt-1">{clients.length} clients registrats</p>
        </div>
        {!showForm && (
          <Button variant="tramit" onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nou client
          </Button>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-4 py-3 rounded-lg">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">{success}</span>
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
                  <Input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nom del client"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Empresa</Label>
                  <Input
                    value={form.company}
                    onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                    placeholder="Nom de l'empresa"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Telèfon</Label>
                  <Input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="600 000 000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="client@exemple.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>NIF / CIF</Label>
                  <Input
                    value={form.nif_cif}
                    onChange={e => setForm(f => ({ ...f, nif_cif: e.target.value }))}
                    placeholder="12345678A"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Responsable intern</Label>
                  <select
                    value={form.responsible_id}
                    onChange={e => setForm(f => ({ ...f, responsible_id: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Sense assignar</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Notes internes sobre el client..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
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
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel·lar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Cerca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cercar per nom, empresa, email, telèfon o NIF..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Llista */}
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
            const responsibleName = Array.isArray(client.profiles)
              ? client.profiles[0]?.full_name
              : (client.profiles as { full_name: string } | null)?.full_name

            return (
              <Card key={client.id} className="overflow-hidden">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-tramit-blue-light dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-tramit-blue" />
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{client.name}</p>
                          {client.company && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building2 className="h-3 w-3" />{client.company}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEdit(client)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setExpanded(isExpanded ? null : client.id)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
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
                      </div>
                    </div>
                  </div>

                  {/* Detall expandit */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Origen</p>
                          <p>{ORIGIN_LABELS[client.origin] || client.origin}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Data d&apos;alta</p>
                          <p>{new Date(client.created_at).toLocaleDateString('ca-ES')}</p>
                        </div>
                      </div>
                      {client.notes && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                          <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">{client.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
