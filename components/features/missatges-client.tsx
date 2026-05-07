'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Send, Inbox, SendHorizonal, Plus, X,
  CheckCheck, Clock, ChevronRight, Reply
} from 'lucide-react'

interface Profile {
  id: string
  full_name: string
  color: string | null
  role: string
}

interface Message {
  id: string
  sender_id: string
  recipient_id: string
  subject: string
  body: string
  read: boolean
  read_at: string | null
  parent_id: string | null
  created_at: string
  sender?: { full_name: string; color: string | null; role: string } | null
  recipient?: { full_name: string; color: string | null; role: string } | null
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return 'Ara mateix'
  if (diff < 3600) return `Fa ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Fa ${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `Fa ${Math.floor(diff / 86400)} dies`
  return date.toLocaleDateString('ca-ES', { day: '2-digit', month: 'short' })
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administradora',
  supervisor: 'Supervisor',
  worker: 'Treballador/a',
}

export function MissatgesClient({
  currentUserId,
  profiles,
}: {
  currentUserId: string
  profiles: Profile[]
}) {
  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox')
  const [received, setReceived] = useState<Message[]>([])
  const [sent, setSent] = useState<Message[]>([])
  const [selected, setSelected] = useState<Message | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [replyMode, setReplyMode] = useState(false)

  const [form, setForm] = useState({
    recipient_id: '',
    subject: '',
    body: '',
  })

  useEffect(() => {
    loadMessages()
    const interval = setInterval(loadMessages, 15000)
    return () => clearInterval(interval)
  }, [])

  async function loadMessages() {
    try {
      const res = await fetch('/api/messages')
      if (res.ok) {
        const data = await res.json()
        setReceived(data.received || [])
        setSent(data.sent || [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function openMessage(msg: Message) {
    setSelected(msg)
    setReplyMode(false)
    if (!msg.read && msg.recipient_id === currentUserId) {
      await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: msg.id }),
      })
      setReceived(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m))
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!form.recipient_id || !form.subject || !form.body) return
    setSending(true)
    try {
      const payload = replyMode && selected
        ? { ...form, parent_id: selected.id }
        : form

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setForm({ recipient_id: '', subject: '', body: '' })
        setShowCompose(false)
        setReplyMode(false)
        await loadMessages()
        setTab('sent')
      }
    } finally {
      setSending(false)
    }
  }

  function startReply(msg: Message) {
    const sender = msg.sender as { full_name: string } | null
    setForm({
      recipient_id: msg.sender_id,
      subject: `Re: ${msg.subject}`,
      body: '',
    })
    setReplyMode(true)
    setShowCompose(true)
  }

  const unreadCount = received.filter(m => !m.read).length
  const currentList = tab === 'inbox' ? received : sent

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 max-w-5xl">
      {/* Llista de missatges */}
      <div className="w-80 shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Missatges</h1>
          <Button
            variant="tramit"
            size="sm"
            onClick={() => { setShowCompose(true); setReplyMode(false); setForm({ recipient_id: '', subject: '', body: '' }) }}
            className="flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Nou
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setTab('inbox')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === 'inbox' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          >
            <Inbox className="h-3.5 w-3.5" />
            Rebuts
            {unreadCount > 0 && (
              <span className="bg-tramit-blue text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('sent')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === 'sent' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          >
            <SendHorizonal className="h-3.5 w-3.5" />
            Enviats
          </button>
        </div>

        {/* Llista */}
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 h-full overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : currentList.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Cap missatge</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {currentList.map(msg => {
                  const isUnread = !msg.read && msg.recipient_id === currentUserId
                  const contactProfile = tab === 'inbox'
                    ? msg.sender as { full_name: string; color: string | null } | null
                    : msg.recipient as { full_name: string; color: string | null } | null
                  const color = contactProfile?.color || '#2272A3'
                  const name = contactProfile?.full_name || '—'

                  return (
                    <button
                      key={msg.id}
                      onClick={() => openMessage(msg)}
                      className={`w-full text-left p-3 transition-colors hover:bg-muted/50 ${
                        selected?.id === msg.id ? 'bg-tramit-blue-light dark:bg-blue-900/20' : ''
                      } ${isUnread ? 'border-l-2 border-tramit-blue' : ''}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                          style={{ backgroundColor: color }}
                        >
                          {getInitials(name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className={`text-xs truncate ${isUnread ? 'font-bold' : 'font-medium'}`}>
                              {name.split(' ')[0]}
                            </p>
                            <p className="text-[10px] text-muted-foreground shrink-0">{timeAgo(msg.created_at)}</p>
                          </div>
                          <p className={`text-xs truncate mt-0.5 ${isUnread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                            {msg.subject}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{msg.body}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contingut principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {showCompose ? (
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {replyMode ? 'Respondre' : 'Nou missatge'}
                </CardTitle>
                <button
                  onClick={() => { setShowCompose(false); setReplyMode(false) }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Per a *</Label>
                  <select
                    value={form.recipient_id}
                    onChange={e => setForm(f => ({ ...f, recipient_id: e.target.value }))}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Selecciona un destinatari</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} — {ROLE_LABELS[p.role] || p.role}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>Assumpte *</Label>
                  <Input
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Assumpte del missatge"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Missatge *</Label>
                  <textarea
                    value={form.body}
                    onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                    placeholder="Escriu el teu missatge..."
                    rows={8}
                    required
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="tramit"
                    disabled={sending}
                    className="flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? 'Enviant...' : 'Enviar'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowCompose(false); setReplyMode(false) }}
                  >
                    Cancel·lar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : selected ? (
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-base">{selected.subject}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const senderProfile = selected.sender as { full_name: string; color: string | null } | null
                      const recipientProfile = selected.recipient as { full_name: string; color: string | null } | null
                      const isSent = selected.sender_id === currentUserId
                      const contactProfile = isSent ? recipientProfile : senderProfile
                      const color = contactProfile?.color || '#2272A3'
                      const name = contactProfile?.full_name || '—'
                      return (
                        <>
                          <div
                            className="h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                            style={{ backgroundColor: color }}
                          >
                            {getInitials(name)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {isSent ? `A: ${name}` : `De: ${name}`}
                            {' · '}
                            {timeAgo(selected.created_at)}
                          </p>
                          {selected.read && !isSent && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <CheckCheck className="h-3 w-3 text-tramit-blue" />
                              Llegit
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
                {selected.recipient_id === currentUserId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startReply(selected)}
                    className="flex items-center gap-1.5 shrink-0"
                  >
                    <Reply className="h-3.5 w-3.5" />
                    Respondre
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pt-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {selected.body.split('\n').map((line, i) => (
                  <p key={i} className={`text-sm leading-relaxed ${line === '' ? 'mt-3' : 'mt-1'}`}>
                    {line || '\u00A0'}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground space-y-3">
              <Inbox className="h-12 w-12 mx-auto opacity-20" />
              <div>
                <p className="font-medium">Selecciona un missatge</p>
                <p className="text-sm mt-1">O crea un nou missatge per a l&apos;equip</p>
              </div>
              <Button
                variant="tramit"
                size="sm"
                onClick={() => setShowCompose(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nou missatge
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
