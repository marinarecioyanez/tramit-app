'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Send, Bot, User, Loader2, RefreshCw,
  BookOpen, AlertCircle, Lightbulb
} from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED_QUESTIONS = [
  '¿Quines despeses pot deduir-se un autònom?',
  '¿Quan s\'ha de presentar el model 303 d\'IVA?',
  '¿Com funciona la deducció per habitatge habitual?',
  '¿Quins models trimestrals ha de presentar una SL?',
  '¿Quina és la base mínima de cotització d\'autònoms el 2026?',
  '¿Com tributen les dietes i despeses de representació?',
]

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  // Formatar el text: negreta per **text** i llistes
  function formatText(text: string) {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      // Negreta
      const parts = line.split(/\*\*(.*?)\*\*/g)
      const formatted = parts.map((part, j) =>
        j % 2 === 1 ? <strong key={j}>{part}</strong> : part
      )
      // Llista
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return (
          <li key={i} className="ml-4 list-disc">
            {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
          </li>
        )
      }
      if (line.match(/^\d+\./)) {
        return <li key={i} className="ml-4 list-decimal">{formatted}</li>
      }
      if (line === '') return <br key={i} />
      return <p key={i} className="mb-1">{formatted}</p>
    })
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
        isUser
          ? 'bg-tramit-blue text-white'
          : 'bg-slate-100 dark:bg-slate-800'
      }`}>
        {isUser
          ? <User className="h-4 w-4" />
          : <Bot className="h-4 w-4 text-tramit-blue" />
        }
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-tramit-blue text-white rounded-tr-sm'
          : 'bg-slate-50 dark:bg-slate-800 text-foreground rounded-tl-sm border border-border'
      }`}>
        <div className={`space-y-0.5 ${isUser ? '' : 'prose-sm'}`}>
          {formatText(message.content)}
        </div>
      </div>
    </div>
  )
}

export function AssessorClient() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text?: string) {
    const messageText = text || input.trim()
    if (!messageText || loading) return

    setInput('')
    setError(null)

    const userMessage: Message = { role: 'user', content: messageText }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/assessor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error de connexió')
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperat')
      setMessages(prev => prev.slice(0, -1)) // Treure el missatge de l'usuari si hi ha error
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function clearChat() {
    setMessages([])
    setError(null)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
      {/* Capçalera */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-tramit-blue text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Assessor Fiscal</h1>
            <p className="text-xs text-muted-foreground">
              Expert en fiscalitat i comptabilitat espanyola · Powered by Claude AI
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearChat}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Nova consulta
          </Button>
        )}
      </div>

      {/* Avís legal */}
      <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2.5 mb-4">
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Les respostes són orientatives i basades en la normativa vigent. Per a decisions importants, confirma sempre amb un professional o les fonts oficials (AEAT, BOE).
        </p>
      </div>

      {/* Àrea de xat */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-8">
              <div className="p-4 rounded-full bg-tramit-blue-light dark:bg-blue-900/20">
                <Bot className="h-10 w-10 text-tramit-blue" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Benvingut/da a l&apos;Assessor Fiscal</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                  Fes-me qualsevol pregunta sobre fiscalitat, comptabilitat, autònoms, IVA, IRPF i molt més.
                </p>
              </div>

              <div className="w-full max-w-md space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Preguntes freqüents:
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="text-left text-sm px-3 py-2.5 rounded-lg border border-border hover:border-tramit-blue/50 hover:bg-tramit-blue-light/50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-tramit-blue" />
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl rounded-tl-sm border border-border px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-tramit-blue" />
                    <span className="text-sm text-muted-foreground">Consultant fonts fiscals...</span>
                  </div>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendMessage(messages[messages.length - 1]?.content)}
                    className="ml-auto shrink-0 text-xs"
                  >
                    Reintentar
                  </Button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>

        {/* Input */}
        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escriu la teva consulta fiscal..."
              disabled={loading}
              className="flex-1"
            />
            <Button
              onClick={() => sendMessage()}
              variant="tramit"
              size="icon"
              disabled={loading || !input.trim()}
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />
              }
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Prem Enter per enviar · Shift+Enter per nova línia
          </p>
        </div>
      </Card>
    </div>
  )
}
