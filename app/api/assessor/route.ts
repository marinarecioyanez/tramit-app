import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'No autenticat' }, { status: 401 })

  const { messages, isAdmin } = await request.json()
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Missatges invàlids' }, { status: 400 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })
  }

  // ── Carregar context real de Supabase ──
  const today = new Date().toISOString().split('T')[0]
  const currentYear = new Date().getFullYear()
  const in30Days = new Date(); in30Days.setDate(in30Days.getDate() + 30)

  const [
    { data: pendingRequests },
    { data: upcomingDeadlines },
    { data: pendingTasks },
    { data: activeClients },
    { data: recentActivity },
    { data: balances },
    { data: profiles },
  ] = await Promise.all([
    supabase.from('absence_requests')
      .select('id, type, start_date, end_date, profiles!absence_requests_user_id_fkey(full_name)')
      .eq('status', 'pending').limit(10),
    supabase.from('fiscal_deadlines')
      .select('name, date, model, description')
      .gte('date', today)
      .lte('date', in30Days.toISOString().split('T')[0])
      .order('date').limit(5),
    supabase.from('tasks')
      .select('id, title, status, priority, due_date, profiles!tasks_assigned_to_fkey(full_name), clients(name)')
      .in('status', ['pending', 'in_progress'])
      .order('priority', { ascending: false }).limit(10),
    supabase.from('clients')
      .select('id, name, status, last_contact_at')
      .eq('status', 'active').limit(20),
    supabase.from('absence_requests')
      .select('type, start_date, end_date, profiles!absence_requests_user_id_fkey(full_name)')
      .eq('status', 'approved')
      .gte('start_date', today)
      .lte('start_date', in30Days.toISOString().split('T')[0])
      .order('start_date').limit(5),
    isAdmin ? supabase.from('vacation_balances')
      .select('total_days, used_days, pending_days, profiles!vacation_balances_user_id_fkey(full_name)')
      .eq('year', currentYear) : { data: [] },
    supabase.from('profiles')
      .select('full_name, role').eq('active', true),
  ])

  // Clients sense contacte >90 dies
  const staleClients = (activeClients || []).filter(c => {
    if (!c.last_contact_at) return true
    return Math.floor((Date.now() - new Date(c.last_contact_at).getTime()) / 86400000) > 90
  })

  const contextData = `
=== CONTEXT ACTUAL DE TRÀMIT ECONOMISTES (${new Date().toLocaleDateString('ca-ES')}) ===

EQUIP (${(profiles || []).length} membres actius):
${(profiles || []).map((p: { full_name: string; role: string }) => `- ${p.full_name} (${p.role})`).join('\n')}

SOL·LICITUDS DE VACANCES/ABSÈNCIES PENDENTS D'APROVACIÓ (${(pendingRequests || []).length}):
${(pendingRequests || []).length === 0 ? '- Cap pendent' : (pendingRequests || []).map((r: { type: string; start_date: string; end_date: string; profiles?: { full_name?: string } | null }) => `- ${(r.profiles as { full_name?: string } | null)?.full_name || '?'}: ${r.type} (${r.start_date} → ${r.end_date})`).join('\n')}

TERMINIS FISCALS PRÒXIMS (30 dies):
${(upcomingDeadlines || []).length === 0 ? '- Cap termini proper' : (upcomingDeadlines || []).map((d: { name: string; date: string; model?: string | null }) => `- ${d.date}: ${d.name}${d.model ? ` (Model ${d.model})` : ''}`).join('\n')}

TASQUES ACTIVES (${(pendingTasks || []).length}):
${(pendingTasks || []).slice(0, 8).map((t: { title: string; priority: string; due_date?: string | null; profiles?: { full_name?: string } | null; clients?: { name?: string } | null }) => `- [${t.priority.toUpperCase()}] ${t.title}${(t.clients as { name?: string } | null)?.name ? ` → Client: ${(t.clients as { name: string }).name}` : ''}${(t.profiles as { full_name?: string } | null)?.full_name ? ` (Assignada a: ${(t.profiles as { full_name: string }).full_name})` : ''}${t.due_date ? ` | Data límit: ${t.due_date}` : ''}`).join('\n')}

ABSÈNCIES PRÒXIMES DE L'EQUIP:
${(recentActivity || []).length === 0 ? '- Cap absència propera' : (recentActivity || []).map((a: { profiles?: { full_name?: string } | null; type: string; start_date: string; end_date: string }) => `- ${(a.profiles as { full_name?: string } | null)?.full_name || '?'}: ${a.type} (${a.start_date} → ${a.end_date})`).join('\n')}

CLIENTS SENSE CONTACTE >90 DIES (${staleClients.length}):
${staleClients.length === 0 ? '- Cap client sense contacte recent' : staleClients.slice(0, 5).map(c => `- ${c.name}`).join('\n')}

${isAdmin && (balances || []).length > 0 ? `SALDOS DE VACANCES ${currentYear}:
${(balances || []).map((b: { profiles?: { full_name?: string } | null; total_days: number; used_days: number; pending_days: number }) => `- ${(b.profiles as { full_name?: string } | null)?.full_name || '?'}: ${b.used_days}/${b.total_days} dies usats (${b.pending_days} pendents)`).join('\n')}` : ''}
`

  const systemPrompt = `Ets l'Assessor Tràmit, l'assistent intel·ligent intern de Tràmit Economistes, una gestoria professional a Catalunya.

Tens accés al context real i actualitzat de la firma (dades de Supabase):
${contextData}

Les teves capacitats:
1. GESTIÓ INTERNA: Respondre preguntes sobre l'equip, vacances, tasques, terminis, clients
2. ASSESSORIA FISCAL: Expert en normativa espanyola i catalana (IRPF, IVA, IS, autònoms, SS)
3. REDACCIÓ: Redactar emails professionals als clients en el to de la firma
4. ALERTES: Detectar situacions que requereixen atenció immediata

FONTS LEGALS que cites quan és rellevant:
- AEAT (aeat.es), Agència Tributària de Catalunya, BOE, DOGC, Seguretat Social

INSTRUCCIONS:
- Respon sempre en català, de forma clara i professional però propera
- Usa les dades del context per respondre preguntes sobre l'equip i clients
- Per emails al client: usa el to professional de Tràmit Economistes, inclou salutació i comiat
- Per càlculs fiscals: indica que són estimacions orientatives
- Si no saps alguna cosa, indica-ho clarament
- Estructura les respostes llargues amb llistes o seccions
- Sigues concís però complet`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: messages.slice(-10),
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
