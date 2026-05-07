'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmailDraft } from './email-draft'
import { ClientOpportunities } from './client-opportunities'
import { DocumentOCR } from './document-ocr'
import {
  ArrowLeft, User, Building2, Phone, Mail, FileText,
  MessageSquare, Calendar, CheckSquare, TrendingUp,
  Plus, Send, Clock, CheckCircle, XCircle,
  Shield, AlertTriangle, Tag, MapPin
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
  status: string
  client_type: string
  pipeline_stage: string | null
  estimated_value: number | null
  last_contact_at: string | null
  tags: string[]
  address: string | null
  city: string | null
  created_at: string
  profiles?: { full_name: string; color: string | null } | null
}

interface Activity {
  id: string
  type: string
  title: string
  body: string | null
  created_at: string
  profiles?: { full_name: string; color: string | null } | null
}

interface Appointment {
  id: string
  start_time: string
  end_time: string
  topic: string
  status: string
  channel: string
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  profiles?: { full_name: string; color: string | null } | null
}

interface Quote {
  id: string
  number: string
  title: string
  amount: number
  status: string
  created_at: string
}

interface Consent {
  id: string
  type: string
  granted: boolean
  granted_at: string | null
}

interface Profile {
  id: string
  full_name: string
  color: string | null
}

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  meeting: Calendar,
  document: FileText,
  task: CheckSquare,
  appointment: Calendar,
  status_change: TrendingUp,
  other: Clock,
}

const ACTIVITY_COLORS: Record<string, string> = {
  note: 'bg-slate-100 text-slate-600',
  call: 'bg-green-100 text-green-600',
  email: 'bg-blue-100 text-blue-600',
  meeting: 'bg-purple-100 text-purple-600',
  document: 'bg-amber-100 text-amber-600',
  task: 'bg-orange-100 text-orange-600',
  appointment: 'bg-tramit-blue-light text-tramit-blue',
  status_change: 'bg-pink-100 text-pink-600',
  other: 'bg-muted text-muted-foreground',
}

const TOPIC_LABELS: Record<string, string> = {
  fiscal: 'Fiscal', labor: 'Laboral', accounting: 'Comptable',
  income_tax: 'Renda', freelance: 'Autònoms', companies: 'Societats',
  internal_meeting: 'Reunió interna', client_query: 'Consulta client',
  documentation: 'Documentació', other: 'Altre',
}

const QUOTE_STATUS: Record<string, { label: string; style: string }> = {
  draft: { label: 'Esborrany', style: 'bg-slate-100 text-slate-600' },
  sent: { label: 'Enviat', style: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Acceptat', style: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rebutjat', style: 'bg-red-100 text-red-700' },
  invoiced: { label: 'Facturat', style: 'bg-purple-100 text-purple-700' },
  paid: { label: 'Cobrat', style: 'bg-emerald-100 text-emerald-700' },
}

const CONSENT_LABELS: Record<string, string> = {
  communications: 'Comunicacions comercials',
  data_processing: 'Tractament de dades',
  marketing: 'Marketing i newsletters',
}

type Tab = 'activitat' | 'cites' | 'tasques' | 'pressupostos' | 'rgpd'

export function ClientDetailClient({
  client, activity, appointments, tasks, quotes, consents, profiles
}: {
  client: Client
  activity: Activity[]
  appointments: Appointment[]
  tasks: Task[]
  quotes: Quote[]
  consents: Consent[]
  profiles: Profile[]
}) {
  const [activeTab, setActiveTab] = useState<Tab>('activitat')
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [showQuoteForm, setShowQuoteForm] = useState(false)
  const [quoteForm, setQuoteForm] = useState({ title: '', amount: '', tax_rate: '21', description: '', valid_until: '' })
  const [savingQuote, setSavingQuote] = useState(false)

  const supabase = createClient()

  const responsibleName = (client.profiles as { full_name: string } | null)?.full_name

  async function addNote() {
    if (!newNote.trim()) return
    setSavingNote(true)
    await supabase.from('client_activity').insert({
      client_id: client.id,
      type: 'note',
      title: 'Nota afegida',
      body: newNote.trim(),
    })
    setSavingNote(false)
    setNewNote('')
    window.location.reload()
  }

  async function createQuote(e: React.FormEvent) {
    e.preventDefault()
    setSavingQuote(true)
    const { data: { user } } = await supabase.auth.getUser()
    const number = `PRE-${Date.now().toString().slice(-6)}`

    await supabase.from('quotes').insert({
      client_id: client.id,
      created_by: user!.id,
      number,
      title: quoteForm.title,
      amount: parseFloat(quoteForm.amount),
      tax_rate: parseFloat(quoteForm.tax_rate),
      description: quoteForm.description || null,
      valid_until: quoteForm.valid_until || null,
      status: 'draft',
    })

    await supabase.from('client_activity').insert({
      client_id: client.id,
      type: 'other',
      title: `Pressupost creat: ${quoteForm.title}`,
    })

    setSavingQuote(false)
    setShowQuoteForm(false)
    setQuoteForm({ title: '', amount: '', tax_rate: '21', description: '', valid_until: '' })
    window.location.reload()
  }

  async function updateQuoteStatus(quoteId: string, status: string) {
    await supabase.from('quotes').update({ status }).eq('id', quoteId)
    window.location.reload()
  }

  async function updateConsent(type: string, granted: boolean) {
    await supabase.from('client_consents').upsert({
      client_id: client.id,
      type,
      granted,
      granted_at: granted ? new Date().toISOString() : null,
      method: 'manual_admin',
    }, { onConflict: 'client_id,type' })
    window.location.reload()
  }

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'activitat', label: 'Activitat', count: activity.length },
    { id: 'cites', label: 'Cites', count: appointments.length },
    { id: 'tasques', label: 'Tasques', count: tasks.filter(t => t.status !== 'done').length },
    { id: 'pressupostos', label: 'Pressupostos', count: quotes.length },
    { id: 'rgpd', label: 'RGPD' },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Capçalera */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard/clients" className="p-2 rounded-lg hover:bg-muted transition-colors mt-1">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold">{client.name}</h1>
              {client.company && (
                <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Building2 className="h-4 w-4" />{client.company}
                </p>
              )}
            </div>
            <Link href={`/dashboard/clients/${client.id}/edit`}>
              <Button variant="outline" size="sm">Editar fitxa</Button>
            </Link>
          </div>

          {/* Info ràpida */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <Card>
              <CardContent className="pt-3 pb-3 text-center">
                <p className="text-xl font-bold text-tramit-blue">{appointments.length}</p>
                <p className="text-xs text-muted-foreground">Cites totals</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-3 text-center">
                <p className="text-xl font-bold text-green-600">
                  {quotes.filter(q => q.status === 'paid').reduce((s, q) => s + q.amount, 0).toLocaleString('ca-ES')}€
                </p>
                <p className="text-xs text-muted-foreground">Facturat total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-3 text-center">
                <p className="text-xl font-bold text-amber-500">
                  {tasks.filter(t => t.status !== 'done').length}
                </p>
                <p className="text-xs text-muted-foreground">Tasques obertes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-3 text-center">
                <p className="text-xl font-bold">
                  {client.last_contact_at
                    ? `${Math.floor((new Date().getTime() - new Date(client.last_contact_at).getTime()) / (1000 * 60 * 60 * 24))}d`
                    : '—'}
                </p>
                <p className="text-xs text-muted-foreground">Des del darrer contacte</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar d'informació */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Informació de contacte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {client.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`tel:${client.phone}`} className="hover:text-tramit-blue transition-colors">{client.phone}</a>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`mailto:${client.email}`} className="hover:text-tramit-blue transition-colors truncate">{client.email}</a>
                </div>
              )}
              {client.nif_cif && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{client.nif_cif}</span>
                </div>
              )}
              {client.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{client.address}{client.city && `, ${client.city}`}</span>
                </div>
              )}
              {responsibleName && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Responsable: <strong>{responsibleName}</strong></span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">CRM</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tipus</span>
                <span className="font-medium">
                  {{ particular: 'Particular', autonomo: 'Autònom', empresa: 'Empresa', asociacion: 'Associació' }[client.client_type] || client.client_type}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estat</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  client.status === 'active' ? 'bg-green-100 text-green-700' :
                  client.status === 'inactive' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {client.status}
                </span>
              </div>
              {client.pipeline_stage && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pipeline</span>
                  <span className="font-medium">{client.pipeline_stage}</span>
                </div>
              )}
              {client.estimated_value && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor estimat</span>
                  <span className="font-bold text-tramit-blue">{client.estimated_value.toLocaleString('ca-ES')}€</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Alta</span>
                <span>{new Date(client.created_at).toLocaleDateString('ca-ES')}</span>
              </div>
            </CardContent>
          </Card>

          {client.tags && client.tags.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />Etiquetes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-1.5 flex-wrap">
                  {client.tags.map(tag => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-tramit-blue-light dark:bg-blue-900/20 text-tramit-blue">
                      {tag}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {client.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{client.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Contingut principal */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-muted p-1 rounded-lg flex-wrap">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === tab.id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="bg-tramit-blue text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab: Activitat */}
          {activeTab === 'activitat' && (
            <div className="space-y-4">
              {/* Afegir nota */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex gap-2">
                    <textarea value={newNote} onChange={e => setNewNote(e.target.value)}
                      placeholder="Afegir una nota, trucada, acció realitzada..."
                      rows={2}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                    <Button variant="tramit" size="icon" onClick={addNote} disabled={savingNote || !newNote.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Línia de temps */}
              {activity.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Sense activitat registrada</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {activity.map(act => {
                    const Icon = ACTIVITY_ICONS[act.type] || Clock
                    const colorClass = ACTIVITY_COLORS[act.type] || ACTIVITY_COLORS.other
                    const user = act.profiles as { full_name: string; color: string | null } | null

                    return (
                      <div key={act.id} className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${colorClass}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{act.title}</p>
                            <span className="text-xs text-muted-foreground">
                              {new Date(act.created_at).toLocaleDateString('ca-ES', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                            {user?.full_name && (
                              <span className="text-xs text-muted-foreground">· {user.full_name.split(' ')[0]}</span>
                            )}
                          </div>
                          {act.body && <p className="text-xs text-muted-foreground mt-0.5">{act.body}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab: Cites */}
          {activeTab === 'cites' && (
            <div className="space-y-3">
              {appointments.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Cap cita registrada</p>
                  </CardContent>
                </Card>
              ) : (
                appointments.map(apt => (
                  <Card key={apt.id}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{TOPIC_LABELS[apt.topic] || apt.topic}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(apt.start_time).toLocaleDateString('ca-ES', {
                              day: '2-digit', month: 'long', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {apt.status}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Tab: Tasques */}
          {activeTab === 'tasques' && (
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Cap tasca assignada</p>
                  </CardContent>
                </Card>
              ) : (
                tasks.map(task => {
                  const assignedProfile = task.profiles as { full_name: string } | null
                  return (
                    <Card key={task.id}>
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                            </p>
                            {assignedProfile && (
                              <p className="text-xs text-muted-foreground">{assignedProfile.full_name}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {task.due_date && (
                              <span className="text-xs text-muted-foreground">{task.due_date}</span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              task.status === 'done' ? 'bg-green-100 text-green-700' :
                              task.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {task.status === 'done' ? 'Fet' : task.status === 'in_progress' ? 'En curs' : 'Pendent'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          )}

          {/* Tab: Pressupostos */}
          {activeTab === 'pressupostos' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="tramit" size="sm" onClick={() => setShowQuoteForm(true)} className="flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Nou pressupost
                </Button>
              </div>

              {showQuoteForm && (
                <Card className="border-tramit-blue/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Nou pressupost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={createQuote} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5 col-span-2">
                          <Label>Títol *</Label>
                          <Input value={quoteForm.title} onChange={e => setQuoteForm(f => ({ ...f, title: e.target.value }))} required placeholder="Descripció del servei" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Import (€) *</Label>
                          <Input type="number" value={quoteForm.amount} onChange={e => setQuoteForm(f => ({ ...f, amount: e.target.value }))} required min="0" step="0.01" placeholder="0.00" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>IVA (%)</Label>
                          <Input type="number" value={quoteForm.tax_rate} onChange={e => setQuoteForm(f => ({ ...f, tax_rate: e.target.value }))} min="0" max="100" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Vàlid fins</Label>
                          <Input type="date" value={quoteForm.valid_until} onChange={e => setQuoteForm(f => ({ ...f, valid_until: e.target.value }))} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" variant="tramit" size="sm" disabled={savingQuote}>
                          {savingQuote ? 'Creant...' : 'Crear pressupost'}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowQuoteForm(false)}>
                          Cancel·lar
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {quotes.length === 0 && !showQuoteForm ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Cap pressupost creat</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {quotes.map(quote => {
                    const total = quote.amount * (1 + 0.21)
                    return (
                      <Card key={quote.id}>
                        <CardContent className="pt-3 pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-mono text-muted-foreground">{quote.number}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${QUOTE_STATUS[quote.status]?.style}`}>
                                  {QUOTE_STATUS[quote.status]?.label}
                                </span>
                              </div>
                              <p className="text-sm font-medium mt-0.5">{quote.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {quote.amount.toLocaleString('ca-ES')}€ + IVA = <strong>{total.toLocaleString('ca-ES', { maximumFractionDigits: 2 })}€</strong>
                              </p>
                            </div>
                            <div className="flex gap-1 flex-wrap shrink-0">
                              {quote.status === 'draft' && (
                                <Button size="sm" variant="outline" onClick={() => updateQuoteStatus(quote.id, 'sent')} className="text-xs">
                                  Marcar enviat
                                </Button>
                              )}
                              {quote.status === 'sent' && (
                                <>
                                  <Button size="sm" variant="tramit" onClick={() => updateQuoteStatus(quote.id, 'accepted')} className="text-xs flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />Acceptat
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => updateQuoteStatus(quote.id, 'rejected')} className="text-xs flex items-center gap-1 text-red-600">
                                    <XCircle className="h-3 w-3" />Rebutjat
                                  </Button>
                                </>
                              )}
                              {quote.status === 'accepted' && (
                                <Button size="sm" variant="outline" onClick={() => updateQuoteStatus(quote.id, 'paid')} className="text-xs">
                                  Marcar cobrat
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab: RGPD */}
          {activeTab === 'rgpd' && (
            <div className="space-y-4">
              <Card className="border-amber-200 dark:border-amber-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 text-amber-500" />
                    Consentiments RGPD
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(['communications', 'data_processing', 'marketing'] as const).map(type => {
                    const consent = consents.find(c => c.type === type)
                    const isGranted = consent?.granted || false

                    return (
                      <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm font-medium">{CONSENT_LABELS[type]}</p>
                          {consent?.granted_at && (
                            <p className="text-xs text-muted-foreground">
                              {isGranted ? 'Atorgat' : 'Revocat'} el {new Date(consent.granted_at).toLocaleDateString('ca-ES')}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => updateConsent(type, !isGranted)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isGranted ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isGranted ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    )
                  })}

                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 px-4 py-3 mt-2">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      ⚖️ Tots els canvis de consentiment queden registrats amb data i hora per compliment del RGPD.
                      El client pot revocar el seu consentiment en qualsevol moment.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Dret d&apos;oblit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    El client pot sol·licitar la supressió de totes les seves dades personals.
                    Aquesta acció és irreversible i requereix confirmació de l&apos;administrador.
                  </p>
                  <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
                    Sol·licitar supressió de dades
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
