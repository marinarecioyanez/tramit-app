'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, X, CheckCircle, AlertTriangle } from 'lucide-react'

interface Profile {
  id: string
  full_name: string
  role: string
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

export function NovaCitaButton({
  profiles,
  currentUserId,
  currentUserRole,
}: {
  profiles: Profile[]
  currentUserId: string
  currentUserRole: string
}) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const [form, setForm] = useState({
    main_attendee_id: '',
    start_date: '',
    start_time: '09:00',
    end_time: '10:00',
    topic: 'fiscal',
    channel: 'in_person',
    priority: 'normal',
    location: '',
    internal_notes: '',
  })

  const workers = profiles.filter(p => p.role === 'worker' || p.role === 'admin')

  function resetForm() {
    setForm({
      main_attendee_id: '',
      start_date: '',
      start_time: '09:00',
      end_time: '10:00',
      topic: 'fiscal',
      channel: 'in_person',
      priority: 'normal',
      location: '',
      internal_notes: '',
    })
    setShowForm(false)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.main_attendee_id || !form.start_date) {
      setError('Cal seleccionar un destinatari i una data.')
      return
    }

    if (form.start_time >= form.end_time) {
      setError('L\'hora de fi ha de ser posterior a l\'hora d\'inici.')
      return
    }

    setSaving(true)
    try {
      const startTime = `${form.start_date}T${form.start_time}:00`
      const endTime = `${form.start_date}T${form.end_time}:00`

      // Si és admin, la cita entra directament confirmada
      const isAdmin = currentUserRole === 'admin' || currentUserRole === 'supervisor'
      const status = isAdmin && form.main_attendee_id !== currentUserId
        ? 'confirmed'
        : form.main_attendee_id === currentUserId
        ? 'confirmed'
        : 'pending'

      const { data: appointment, error: insertError } = await supabase
        .from('appointments')
        .insert({
          created_by: currentUserId,
          main_attendee_id: form.main_attendee_id,
          start_time: startTime,
          end_time: endTime,
          topic: form.topic,
          channel: form.channel,
          priority: form.priority,
          location: form.location || null,
          internal_notes: form.internal_notes || null,
          status,
          send_email_to_client: false,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Crear assistent principal
      await supabase.from('appointment_attendees').insert({
        appointment_id: appointment.id,
        user_id: form.main_attendee_id,
        is_main: true,
        status: status === 'confirmed' ? 'accepted' : 'pending',
      })

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        resetForm()
        window.location.reload()
      }, 1500)
    } catch {
      setError("S'ha produït un error. Torna-ho a intentar.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {!showForm && (
        <Button
          variant="tramit"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova cita
        </Button>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Nova cita</CardTitle>
                <button
                  onClick={resetForm}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {success ? (
                <div className="text-center py-6 space-y-3">
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="font-medium">Cita creada correctament!</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Destinatari principal *</Label>
                    <select
                      value={form.main_attendee_id}
                      onChange={e => setForm(f => ({ ...f, main_attendee_id: e.target.value }))}
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Selecciona un treballador</option>
                      {workers.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.full_name}{p.id === currentUserId ? ' (jo)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

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
                      placeholder="Notes visibles només per a l'equip intern..."
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
                    <Button type="button" variant="outline" onClick={resetForm}>
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
