'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, X, CheckCircle, AlertTriangle, Search, UserPlus } from 'lucide-react'

interface Profile {
  id: string
  full_name: string
  role: string
}

interface Client {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
}

const TOPIC_OPTIONS = [
  { value: 'fiscal', label: 'Fiscal' },
  { value: 'labor', label: 'Laboral' },
  { value: 'accounting', label: 'Comptable' },
  { value: 'income_tax', label: 'Renda' },
  { value: 'freelance', label: 'Autònoms' },
  { value: 'companies', label: 'Societats' },
  { value: 'internal_meeting', label: 'Reunió interna' },
  { value: 'client_query', label: 'Consulta client' },
  { value: 'documentation', label: 'Documentació' },
  { value: 'other', label: 'Altre' },
]

const CHANNEL_OPTIONS = [
  { value: 'in_person', label: 'Presencial' },
  { value: 'phone', label: 'Telèfon' },
  { value: 'video', label: 'Videotrucada' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Altre' },
]

const PRIORITY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgent' },
]

interface NovaCitaButtonProps {
  profiles: Profile[]
  currentUserId: string
  currentUserRole: string
  initialDate?: string
  initialTime?: string
  onClose?: () => void
  forceOpen?: boolean
}

export function NovaCitaButton({
  profiles,
  currentUserId,
  currentUserRole,
  initialDate,
  initialTime,
  onClose,
  forceOpen = false,
}: NovaCitaButtonProps) {
  const [showForm, setShowForm] = useState(forceOpen)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [clientSearch, setClientSearch] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [creatingNewClient, setCreatingNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([])

  const supabase = createClient()

  const [form, setForm] = useState({
    main_attendee_id: currentUserId,
    start_date: initialDate || '',
    start_time: initialTime || '09:00',
    end_time: initialTime ? `${String(Number(initialTime.split(':')[0]) + 1).padStart(2, '0')}:00` : '10:00',
    topic: 'fiscal',
    channel: 'in_person',
    priority: 'normal',
    location: '',
    internal_notes: '',
  })

  useEffect(() => {
    if (forceOpen) setShowForm(true)
  }, [forceOpen])

  useEffect(() => {
    if (initialDate) setForm(f => ({ ...f, start_date: initialDate }))
    if (initialTime) {
      const hour = Number(initialTime.split(':')[0])
      setForm(f => ({
        ...f,
        start_time: initialTime,
        end_time: `${String(hour + 1).padStart(2, '0')}:00`,
      }))
    }
  }, [initialDate, initialTime])

  useEffect(() => {
    async function loadClients() {
      const { data } = await supabase
        .from('clients')
        .select('id, name, company, email, phone')
        .order('name')
      setClients(data || [])
    }
    if (showForm) loadClients()
  }, [showForm])

  useEffect(() => {
    if (!clientSearch) {
      setFilteredClients(clients.slice(0, 5))
    } else {
      const q = clientSearch.toLowerCase()
      setFilteredClients(
        clients.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q)
        ).slice(0, 5)
      )
    }
  }, [clientSearch, clients])

  const workers = profiles.filter(p => p.role === 'worker' || p.role === 'admin')

  function toggleAttendee(userId: string) {
    if (userId === form.main_attendee_id) return
    setSelectedAttendees(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  function handleClose() {
    resetForm()
    if (onClose) onClose()
  }

  function resetForm() {
    setForm({
      main_attendee_id: currentUserId,
      start_date: initialDate || '',
      start_time: '09:00',
      end_time: '10:00',
      topic: 'fiscal',
      channel: 'in_person',
      priority: 'normal',
      location: '',
      internal_notes: '',
    })
    setSelectedClient(null)
    setClientSearch('')
    setCreatingNewClient(false)
    setNewClientName('')
    setSelectedAttendees([])
    setShowForm(false)
    setError(null)
    if (onClose) onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.start_date) {
      setError('Cal seleccionar una data.')
      return
    }
    if (form.start_time >= form.end_time) {
      setError("L'hora de fi ha de ser posterior a l'hora d'inici.")
      return
    }

    setSaving(true)
    try {
      let clientId = selectedClient?.id || null

      if (creatingNewClient && newClientName.trim()) {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            name: newClientName.trim(),
            origin: 'appointment',
            responsible_id: form.main_attendee_id,
          })
          .select()
          .single()

        if (clientError) throw clientError
        clientId = newClient.id
      }

      const startTime = `${form.start_date}T${form.start_time}:00`
      const endTime = `${form.start_date}T${form.end_time}:00`

      const res = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          main_attendee_id: form.main_attendee_id,
          client_id: clientId,
          start_time: startTime,
          end_time: endTime,
          topic: form.topic,
          channel: form.channel,
          priority: form.priority,
          location: form.location || null,
          internal_notes: form.internal_notes || null,
          extra_attendees: selectedAttendees,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error creant la cita')

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        resetForm()
        window.location.reload()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "S'ha produït un error.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {!showForm && !forceOpen && (
        <Button
          variant="tramit"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova cita
        </Button>
      )}

      {(showForm || forceOpen) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-3 sticky top-0 bg-background z-10 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Nova cita</CardTitle>
                <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {success ? (
                <div className="text-center py-8 space-y-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                    <CheckCircle className="h-7 w-7 text-green-600" />
                  </div>
                  <p className="font-semibold text-lg">Cita creada!</p>
                  <p className="text-sm text-muted-foreground">Els assistents han rebut la notificació per email.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5 col-span-1">
                      <Label>Data *</Label>
                      <Input
                        type="date"
                        value={form.start_date}
                        onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Hora inici</Label>
                      <Input
                        type="time"
                        value={form.start_time}
                        onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                        min="08:00"
                        max="17:00"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Hora fi</Label>
                      <Input
                        type="time"
                        value={form.end_time}
                        onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                        min="08:00"
                        max="17:00"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Client</Label>
                    {selectedClient ? (
                      <div className="flex items-center justify-between bg-tramit-blue-light dark:bg-blue-900/20 border border-tramit-blue/30 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{selectedClient.name}</p>
                          {selectedClient.company && (
                            <p className="text-xs text-muted-foreground">{selectedClient.company}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSelectedClient(null); setClientSearch('') }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : creatingNewClient ? (
                      <div className="space-y-2">
                        <Input
                          placeholder="Nom del nou client..."
                          value={newClientName}
                          onChange={e => setNewClientName(e.target.value)}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setCreatingNewClient(false)}
                          >
                            Cancel·lar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Cercar client existent..."
                            value={clientSearch}
                            onChange={e => {
                              setClientSearch(e.target.value)
                              setShowClientDropdown(true)
                            }}
                            onFocus={() => setShowClientDropdown(true)}
                            className="pl-9"
                          />
                        </div>
                        {showClientDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-xl z-20 overflow-hidden">
                            {filteredClients.length > 0 && (
                              <div>
                                {filteredClients.map(client => (
                                  <button
                                    key={client.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedClient(client)
                                      setShowClientDropdown(false)
                                      setClientSearch('')
                                    }}
                                    className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors border-b border-border last:border-0"
                                  >
                                    <p className="text-sm font-medium">{client.name}</p>
                                    {client.company && (
                                      <p className="text-xs text-muted-foreground">{client.company}</p>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setCreatingNewClient(true)
                                setShowClientDropdown(false)
                                setNewClientName(clientSearch)
                              }}
                              className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors flex items-center gap-2 text-tramit-blue"
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                              <span className="text-sm font-medium">
                                {clientSearch
                                  ? `Crear "${clientSearch}" com a nou client`
                                  : 'Crear nou client'
                                }
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Treballador principal *</Label>
                    <select
                      value={form.main_attendee_id}
                      onChange={e => {
                        setForm(f => ({ ...f, main_attendee_id: e.target.value }))
                        setSelectedAttendees(prev => prev.filter(id => id !== e.target.value))
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {workers.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.full_name}{p.id === currentUserId ? ' (jo)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Altres assistents <span className="text-muted-foreground">(opcional)</span></Label>
                    <div className="flex flex-wrap gap-2">
                      {workers
                        .filter(p => p.id !== form.main_attendee_id)
                        .map(p => {
                          const isSelected = selectedAttendees.includes(p.id)
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggleAttendee(p.id)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                                isSelected
                                  ? 'bg-tramit-blue text-white border-tramit-blue'
                                  : 'bg-background text-muted-foreground border-border hover:border-tramit-blue/50'
                              }`}
                            >
                              {p.full_name.split(' ')[0]}
                            </button>
                          )
                        })}
                    </div>
                    {selectedAttendees.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Rebran notificació per email: {selectedAttendees.map(id =>
                          workers.find(p => p.id === id)?.full_name.split(' ')[0]
                        ).join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Temàtica *</Label>
                      <select
                        value={form.topic}
                        onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {TOPIC_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Canal *</Label>
                      <select
                        value={form.channel}
                        onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {CHANNEL_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Prioritat</Label>
                      <select
                        value={form.priority}
                        onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {PRIORITY_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Lloc / Enllaç</Label>
                      <Input
                        value={form.location}
                        onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                        placeholder="Sala, telèfon, meet..."
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Notes internes <span className="text-muted-foreground">(opcional)</span></Label>
                    <textarea
                      value={form.internal_notes}
                      onChange={e => setForm(f => ({ ...f, internal_notes: e.target.value }))}
                      placeholder="Visible només per a l'equip intern..."
                      rows={2}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button type="submit" variant="tramit" disabled={saving} className="flex-1">
                      {saving ? 'Creant...' : 'Crear cita'}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleClose}>
                      Cancel·lar
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
