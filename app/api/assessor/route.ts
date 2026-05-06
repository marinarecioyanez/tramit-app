import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticat' }, { status: 401 })
  }

  const { messages } = await request.json()

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Missatges invàlids' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })
  }

  const systemPrompt = `Ets un assessor fiscal i comptable expert especialitzat en la normativa espanyola i catalana. 
Treballes per a Tràmit Economistes, una gestoria professional.

Les teves especialitats són:
- IRPF i declaració de la renda
- IVA i liquidacions trimestrals
- Impost de Societats
- Autònoms (règim especial, deduccions, quotes)
- Comptabilitat d'empreses (PGC)
- Nòmines i Seguretat Social
- Impostos locals (IAE, IBI)
- Normativa laboral bàsica

Fonts que consultes i cites quan és rellevant:
- AEAT (Agència Tributària Espanyola) - aeat.es
- Agència Tributària de Catalunya - atc.gencat.cat
- BOE (Boletín Oficial del Estado) - boe.es
- DOGC (Diari Oficial de la Generalitat de Catalunya)
- Seguretat Social - seg-social.es
- Normativa vigent de l'any en curs

INSTRUCCIONS IMPORTANTS:
- Respon sempre en català, de forma clara i professional
- Cita les fonts legals quan sigui rellevant (articles de llei, resolucions AEAT, etc.)
- Si hi ha canvis normatius recents, indica-ho i recomana verificar amb la font oficial
- Per a qüestions complexes o que requereixin documentació específica, recomana consultar presencialment
- No donis consell que pugui ser perjudicial; si no estàs segur, indica-ho clarament
- Pots fer càlculs orientatius però indica sempre que són estimacions
- Respon de forma estructurada quan la pregunta ho requereixi (llistes, passos, taules)
- Recorda que la normativa fiscal canvia cada any; sempre indica l'any de referència`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: messages.slice(-10), // Últims 10 missatges per context
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Claude API error:', err)
      return NextResponse.json({ error: 'Error de l\'API' }, { status: 500 })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error('Assessor error:', error)
    return NextResponse.json({ error: 'Error intern' }, { status: 500 })
  }
}
