export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getGreeting, formatDateCA } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Clock, Calendar, Umbrella, UserX,
  ChevronRight, AlertCircle, TrendingUp,
  Users, CheckCircle, XCircle, AlertTriangle,
  FileText, CheckSquare, Activity
} from 'lucide-react'
import Link from 'next/link'
import { AppointmentsChart } from '@/components/features/appointments-chart'

export const metadata = { title: 'Tauler — Tràmit Economistes' }

const TOPIC_LABELS: Record<string, string> = {
  fiscal: 'Fiscal', labor: 'Laboral', accounting: 'Comptable',
  income_tax: 'Renda', freelance: 'Autònoms', companies: 'Societats',
  internal_meeting: 'Reunió interna', client_query: 'Consulta client',
  documentation: 'Documentació', other: 'Altre',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

function getDaysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default async function DashboardPage() {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const currentYear = new Date().getFullYear()
  const in30Days = new Date(); in30Days.setDate(in30Days.getDate() + 30)

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('full_name').eq('id', user!.id).single()

  const [
    { data: pendingRequests, count: pendingCount },
    { count: todayAppointmentsCount },
    { data: vacancesAvui, count: vacationsTodayCount },
    { data: noDisponiblesAvui, count: unavailableCount },
    { count: totalWorkers },
    { count: totalClients },
    { count: pendingTasks },
    { data: appointmentsByTopic },
    { data: lowBalances },
    { data: upcomingDeadlines },
    { data: recentActivity },
  ] = await Promise.all([
    supabase.from('absence_requests')
      .select('id, type, start_date, end_date, working_days, profiles!absence_requests_user_id_fkey(full_name, color)', { count: 'exact' })
      .eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
    supabase.from('appointments').select('*', { count: 'exact', head: true })
      .gte('start_time', `${today}T00:00:00`).lte('start_time', `${today}T23:59:59`).neq('status', 'cancelled'),
    supabase.from('absence_requests')
      .select('id, profiles!absence_requests_user_id_fkey(full_name, color)', { count: 'exact' })
      .eq('status', 'approved').eq('type', 'vacation').lte('start_date', today).gte('end_date', today),
    supabase.from('absence_requests')
      .select('id, type, profiles!absence_requests_user_id_fkey(full_name, color)', { count: 'exact' })
      .eq('status', 'approved').neq('type', 'vacation').lte('start_date', today).gte('end_date', today),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'worker').eq('active', true),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).in('status', ['pending', 'in_progress']),
    supabase.from('appointments').select('topic')
      .gte('created_at', new Date(Date.now() - 90 * 86400000).toISOString()).neq('status', 'cancelled'),
    supabase.from('vacation_balances')
      .select('*, profiles!vacation_balances_user_id_fkey(full_name, color)')
      .eq('year', currentYear).order('used_days', { ascending: false }).limit(4),
    supabase.from('fiscal_deadlines')
      .select('*').gte('date', today).lte('date', in30Days.toISOString().split('T')[0])
      .order('date').limit(4),
    supabase.from('absence_requests')
      .select('id, type, status, created_at, profiles!absence_requests_user_id_fkey(full_name, color)')
      .order('created_at', { ascending: false }).limit(6),
  ])

  const topicCounts: Record<string, number> = {}
  appointmentsByTopic?.forEach(apt => {
    const label = TOPIC_LABELS[apt.topic] || apt.topic
    topicCounts[label] = (topicCounts[label] || 0) + 1
  })
  const chartData = Object.entries(topicCounts)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)

  const greeting = getGreeting()
  const firstName = profile?.full_name?.split(' ')[0] || 'Marina'

  const summaryCards = [
    { title: 'Sol·licituds pendents', value: pendingCount || 0, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', href: '/dashboard/vacances' },
    { title: 'Cites avui', value: todayAppointmentsCount || 0, icon: Calendar, color: 'text-tramit-blue', bg: 'bg-tramit-blue-light dark:bg-blue-900/20', href: '/dashboard/agenda' },
    { title: 'Tasques actives', value: pendingTasks || 0, icon: CheckSquare, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', href: '/dashboard/tasques' },
    { title: 'No disponibles avui', value: (vacationsTodayCount || 0) + (unavailableCount || 0), icon: UserX, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800', href: '/dashboard/absencies' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Salutació */}
      <div>
        <h1 className="text-2xl font-bold">{greeting}, {firstName} 👋</h1>
        <p className="text-muted-foreground mt-1 capitalize">{formatDateCA(new Date())}</p>
      </div>

      {/* Alertes urgents */}
      {(pendingCount || 0) > 0 && (
        <Link href="/dashboard/vacances">
          <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 hover:bg-amber-100 transition-colors cursor-pointer">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-400">
              Tens <strong>{pendingCount} sol·licitud{(pendingCount || 0) > 1 ? 's' : ''}</strong> pendent{(pendingCount || 0) > 1 ? 's' : ''} d&apos;aprovació.
            </p>
            <ChevronRight className="h-4 w-4 text-amber-500 ml-auto shrink-0" />
          </div>
        </Link>
      )}

      {/* KPIs principals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <Link href={card.href} key={card.title}>
              <Card className="hover:border-tramit-blue/30 transition-colors cursor-pointer">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">{card.title}</p>
                      <p className="text-3xl font-bold text-foreground">{card.value}</p>
                    </div>
                    <div className={`p-2.5 rounded-lg ${card.bg}`}>
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Fila: Terminis propers + Feed activitat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Terminis fiscals pròxims — 30 dies */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Terminis pròxims (30 dies)
              </CardTitle>
              <Link href="/dashboard/calendari-fiscal" className="text-xs text-tramit-blue hover:underline flex items-center gap-1">
                Tots <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!upcomingDeadlines || upcomingDeadlines.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Cap termini els pròxims 30 dies</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingDeadlines.map((d: { id: string; date: string; name: string; model: string | null }) => {
                  const days = getDaysUntil(d.date)
                  const isUrgent = days <= 7
                  const dateObj = new Date(d.date + 'T00:00:00')
                  return (
                    <div key={d.id} className={`flex items-center gap-3 p-3 rounded-lg ${isUrgent ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800' : 'bg-muted/50'}`}>
                      <div className={`text-center min-w-[40px] ${isUrgent ? 'text-red-600' : 'text-muted-foreground'}`}>
                        <p className="text-lg font-bold leading-none">{dateObj.getDate()}</p>
                        <p className="text-[10px]">{dateObj.toLocaleDateString('ca-ES', { month: 'short' })}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{d.name}</p>
                        {d.model && <p className="text-xs text-muted-foreground">Model {d.model}</p>}
                      </div>
                      <span className={`text-xs font-bold shrink-0 ${isUrgent ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {days === 0 ? 'Avui!' : `${days}d`}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feed d'activitat recent */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-tramit-blue" />
              Activitat recent
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!recentActivity || recentActivity.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Cap activitat recent</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((act: {
                  id: string; type: string; status: string; created_at: string
                  profiles?: { full_name?: string; color?: string } | { full_name?: string; color?: string }[] | null
                }) => {
                  const p = Array.isArray(act.profiles) ? act.profiles[0] : act.profiles
                  const color = (p as { color?: string } | null)?.color || '#2272A3'
                  const name = (p as { full_name?: string } | null)?.full_name || '—'
                  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                  const typeLabel = act.type === 'vacation' ? 'vacances' : act.type === 'sick_leave' ? 'baixa' : 'permís'
                  const statusLabel = act.status === 'pending' ? 'ha sol·licitat' : act.status === 'approved' ? 'aprovades' : 'rebutjades'
                  const diff = Math.floor((Date.now() - new Date(act.created_at).getTime()) / 60000)
                  const timeAgo = diff < 60 ? `fa ${diff}min` : diff < 1440 ? `fa ${Math.floor(diff / 60)}h` : `fa ${Math.floor(diff / 1440)}d`

                  return (
                    <div key={act.id} className="flex items-start gap-2.5">
                      <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5"
                        style={{ backgroundColor: color }}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug">
                          <span className="font-medium">{name.split(' ')[0]}</span>
                          {' '}{statusLabel}{' '}{typeLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">{timeAgo}</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${STATUS_STYLES[act.status]}`}>
                        {act.status === 'pending' ? 'Pendent' : act.status === 'approved' ? 'Aprovada' : 'Rebutjada'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fila: gràfic cites + sol·licituds pendents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Cites per temàtica</CardTitle>
              <span className="text-xs text-muted-foreground">Últims 90 dies</span>
            </div>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Encara no hi ha cites registrades</p>
              </div>
            ) : (
              <AppointmentsChart data={chartData} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Sol·licituds pendents</CardTitle>
              {(pendingCount || 0) > 0 && (
                <Link href="/dashboard/vacances" className="text-xs text-tramit-blue hover:underline flex items-center gap-1">
                  Veure totes <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!pendingRequests || pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Cap sol·licitud pendent</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {pendingRequests.map((req: {
                  id: string; type: string; start_date: string; end_date: string; working_days?: number
                  profiles?: { full_name?: string; color?: string } | { full_name?: string; color?: string }[] | null
                }) => {
                  const p = Array.isArray(req.profiles) ? req.profiles[0] : req.profiles
                  const color = (p as { color?: string } | null)?.color || '#2272A3'
                  const name = (p as { full_name?: string } | null)?.full_name || '—'
                  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                  return (
                    <li key={req.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: color }}>{initials}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          {req.start_date} → {req.end_date}{req.working_days ? ` · ${req.working_days} dies` : ''}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES.pending}`}>Pendent</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fila: absents avui + saldos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Absents avui</CardTitle>
          </CardHeader>
          <CardContent>
            {(vacationsTodayCount || 0) === 0 && (unavailableCount || 0) === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Tot l&apos;equip disponible avui</p>
              </div>
            ) : (
              <div className="space-y-2">
                {vacancesAvui?.map((abs: {
                  id: string
                  profiles?: { full_name?: string; color?: string } | { full_name?: string; color?: string }[] | null
                }) => {
                  const p = Array.isArray(abs.profiles) ? abs.profiles[0] : abs.profiles
                  const color = (p as { color?: string } | null)?.color || '#2272A3'
                  const name = (p as { full_name?: string } | null)?.full_name || '—'
                  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                  return (
                    <div key={abs.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: color }}>{initials}</div>
                      <div className="flex-1"><p className="text-sm font-medium">{name}</p><p className="text-xs text-muted-foreground">Vacances</p></div>
                      <Umbrella className="h-4 w-4 text-tramit-blue shrink-0" />
                    </div>
                  )
                })}
                {noDisponiblesAvui?.map((abs: {
                  id: string; type: string
                  profiles?: { full_name?: string; color?: string } | { full_name?: string; color?: string }[] | null
                }) => (
                  <div key={abs.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                    <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <UserX className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="flex-1"><p className="text-sm font-medium text-muted-foreground">No disponible</p><p className="text-xs text-muted-foreground">Absència registrada</p></div>
                    <UserX className="h-4 w-4 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Saldos {currentYear}</CardTitle>
              <Link href="/dashboard/equip" className="text-xs text-tramit-blue hover:underline flex items-center gap-1">
                Tots <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!lowBalances || lowBalances.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sense dades de saldos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowBalances.map((bal: {
                  id: string; total_days: number; used_days: number; pending_days: number
                  profiles?: { full_name?: string; color?: string } | { full_name?: string; color?: string }[] | null
                }) => {
                  const p = Array.isArray(bal.profiles) ? bal.profiles[0] : bal.profiles
                  const color = (p as { color?: string } | null)?.color || '#2272A3'
                  const name = (p as { full_name?: string } | null)?.full_name || '—'
                  const remaining = bal.total_days - bal.used_days
                  const pct = bal.total_days > 0 ? Math.round((bal.used_days / bal.total_days) * 100) : 0
                  return (
                    <div key={bal.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{name.split(' ')[0]}</span>
                        <span className="text-muted-foreground">
                          <span className="font-semibold text-foreground">{remaining}</span> restants
                          {bal.pending_days > 0 && <span className="text-amber-500 ml-1">({bal.pending_days} pend.)</span>}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
