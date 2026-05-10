'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Sparkles, RefreshCw, ChevronRight } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const QUICK_PROMPTS = [
  'Qui té tasques endarrerides?',
  'Quins terminis fiscals s\'apropen?',
  'Redacta un email professional per a un client',
  'Quantes vacances li queden a l\'equip?',
  'Quins clients no han tingut contacte recent?',
  'Resumeix les cites d\'aquesta setmana',
]

export function AssessorClient({
  userName,
  isAdmin,
}: {
  userName: string
  isAdmin: boolean
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hola, ${userName.split(' ')[0]}! Sóc l'Assessor Tràmit, el teu assistent intel·ligent. Puc ajudar-te a gestionar l'equip, els clients, les tasques i les comunicacions. En què et puc ajudar avui?`,
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(text?: string) {
    const content = text || input.trim()
    if (!content) return
    setInput('')
    const userMsg: Message = { role: 'user', content, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const res = await fetch('/api/assessor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          isAdmin,
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || 'Ho sento, no he pogut processar la teva consulta.',
        timestamp: new Date(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Ha ocorregut un error. Torna-ho a intentar.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }

  function formatTime(date: Date): string {
    return date.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-3xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-tramit-blue" />
          Assessor Tràmit
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Assistent intel·ligent de Tràmit Economistes — consultes, redaccions i gestió interna
        </p>
      </div>

      {/* Suggeriments ràpids */}
      {messages.length <= 1 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Suggeriments:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map(prompt => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border hover:border-tramit-blue/50 hover:bg-tramit-blue-light transition-colors"
              >
                {prompt}
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Missatges */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="h-8 w-8 rounded-full bg-tramit-blue flex items-center justify-center shrink-0 mr-2 mt-1">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
            )}
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-tramit-blue text-white rounded-br-sm'
                  : 'bg-muted text-foreground rounded-bl-sm'
              }`}>
                {msg.content.split('\n').map((line, j) => (
                  <span key={j}>{line}{j < msg.content.split('\n').length - 1 && <br />}</span>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 px-1">
                {formatTime(msg.timestamp)}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="h-8 w-8 rounded-full bg-tramit-blue flex items-center justify-center shrink-0 mr-2">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end">
        {messages.length > 2 && (
          <button
            onClick={() => setMessages(prev => [prev[0]])}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Reiniciar conversa"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
        <div className="flex-1 flex items-end bg-muted rounded-xl px-3 py-2 gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Escriu la teva consulta..."
            rows={1}
            style={{ minHeight: '24px', maxHeight: '120px' }}
            className="flex-1 bg-transparent text-sm resize-none focus:outline-none leading-relaxed"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="p-2 bg-tramit-blue text-white rounded-lg hover:bg-tramit-blue-dark disabled:opacity-40 transition-colors shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-1 text-center">
        Enter per enviar · Shift+Enter per salt de línia
      </p>
    </div>
  )
}
