'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Download, Users, Calendar, TrendingUp,
  CheckSquare, BarChart3, FileText, Umbrella,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react'

interface Balance {
  user_id: string
  total_days: number
  used_days: number
  pending_days: number
  profiles?: { full_name: string; email: string } | null
}

interface Request {
  id: string
  user_id: string
  type: string
  start_date: string
  end_date: string
  working_days: number
  status: string
  profiles?: { full_name: string; email: string } | null
}

interface Profile { id: string; full_name: string; email: string }

interface Client {
  id: string
  name: string
  status: string
  client_type: string
  created_at: string
  estimated_value: number | null
  last_contact_at: string | null
}

interface Appointment {
  id: string
  topic: string
  status: string
  start_time: string
  main_attendee_id: string
}

interface Task {
  id: string
  status: string
  priority: string
  assigned_to: string | null
  created_at: string
  done_at: string | null
}

interface Quote {
  id: string
  amount: number
  status: string
  created_at: string
  client_id: string
}

interface Props {
  balances: Balance[]
  requests: Request[]
  profiles: Profile[]
  clients: Client[]
  appointments: Appointment[]
  tasks: Task[]
  quotes: Quote[]
  currentYear: number
}

function getProfileName(profiles: Balance['profiles']): string {
  if (!profiles) return '—'
  if (Array.isArray(profiles)) return (profiles as { full_name: string }[])[0]?.full_name || '—'
  return (profiles as { full_name: string }).full_name || '—'
}

function getProfileEmail(profiles: Balance['profiles']): string {
  if (!profiles) return '—'
  if (Array.isArray(profiles)) return (profiles as { email: string }[])[0]?.email || '—'
  return (profiles as { email: string }).email || '—'
}

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][][]) {
  const allRows = rows.flat()
  const csv = [
    headers.map(h => `"${h}"`).join(','),
    ...allRows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')
  const bom = '\uFEFF'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

type TabId = 'resum' | 'vacances' | 'clients' | 'productivitat' | 'financier'

const TOPIC_LABELS: Record<string, string> = {
  fiscal: 'Fiscal', labor: 'Laboral', accounting: 'Comptable',
  income_tax: 'Renda', freelance: 'Autònoms', companies: 'Societats',
  internal_meeting: 'Reunió interna', client_query: 'Consulta client',
  documentation: 'Documentació', other: 'Altre',
}

export function InformesNegociClient({
  balances, requests, profiles, clients,
  appointments, tasks, quotes, currentYear
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('resum')
  const [filterYear, setFilterYear] = useState(currentYear)
  const [downloaded, setDownloaded] = useState<string | null>(null)

  function showDownloaded(key: string) {
    setDownloaded(key)
    setTimeout(() => setDownloaded(null), 3000)
  }

  // ── Estadístiques generals ──────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear

    const clientsThisMonth = clients.filter(c => {
      const d = new Date(c.created_at)
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear
    }).length

    const clientsLastMonth = clients.filter(c => {
      const d = new Date(c.created_at)
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear
    }).length

    const aptsThisMonth = appointments.filter(a => {
      const d = new Date(a.start_time)
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear && a.status !== 'cancelled'
    }).length

    const aptsLastMonth = appointments.filter(a => {
      const d = new Date(a.start_time)
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear && a.status !== 'cancelled'
    }).length

    const totalRevenue = quotes.filter(q => q.status === 'paid').reduce((sum, q) => sum + q.amount, 0)
    const pendingRevenue = quotes.filter(q => q.status === 'sent' || q.status === 'accepted').reduce((sum, q) => sum + q.amount, 0)

    const tasksCompleted = tasks.filter(t => t.status === 'done').length
    const tasksPending = tasks.filter(t => t.status !== 'done').length
    const completionRate = tasks.length > 0 ? Math.round((tasksCompleted / tasks.length) * 100) : 0

    const activeClients = clients.filter(c => c.status === 'active').length
    const retentionRate = clients.length > 0 ? Math.round((activeClients / clients.length) * 100) : 0

    return {
      clientsThisMonth,
      clientsLastMonth,
      aptsThisMonth,
      aptsLastMonth,
      totalRevenue,
      pendingRevenue,
      tasksCompleted,
      tasksPending,
      completionRate,
      activeClients,
      totalClients: clients.length,
      retentionRate,
    }
  }, [clients, appointments, tasks, quotes])

  // ── Cites per temàtica ─────────────────────────────────────
  const topicStats = useMemo(() => {
    const counts: Record<string, number> = {}
    appointments
      .filter(a => {
        const d = new Date(a.start_time)
        return d.getFullYear() === filterYear && a.status !== 'cancelled'
      })
      .forEach(a => {
        const label = TOPIC_LABELS[a.topic] || a.topic
        counts[label] = (counts[label] || 0) + 1
      })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
  }, [appointments, filterYear])

  const maxTopicCount = topicStats[0]?.[1] || 1

  // ── Productivitat per treballador ──────────────────────────
  const workerStats = useMemo(() => {
    return profiles.map(p => {
      const workerApts = appointments.filter(a =>
        a.main_attendee_id === p.id &&
        a.status !== 'cancelled' &&
        new Date(a.start_time).getFullYear() === filterYear
      ).length

      const workerTasks = tasks.filter(t => t.assigned_to === p.id)
      const doneTasks = workerTasks.filter(t => t.status === 'done').length
      const rate = workerTasks.length > 0 ? Math.round((doneTasks / workerTasks.length) * 100) : 0

      return {
        id: p.id,
        name: p.full_name,
        appointments: workerApts,
        tasks: workerTasks.length,
        doneTasks,
        completionRate: rate,
      }
    }).sort((a, b) => b.appointments - a.appointments)
  }, [profiles, appointments, tasks, filterYear])

  // ── Clients nous per mes ───────────────────────────────────
  const clientsByMonth = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      label: ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'][i],
      count: 0,
    }))
    clients
      .filter(c => new Date(c.created_at).getFullYear() === filterYear)
      .forEach(c => {
        const m = new Date(c.created_at).getMonth()
        months[m].count++
      })
    return months
  }, [clients, filterYear])

  const maxMonthCount = Math.max(...clientsByMonth.map(m => m.count), 1)

  // ── Exportacions ───────────────────────────────────────────
  function exportVacances() {
    const headers = ['Treballador', 'Email', 'Any', 'Dies totals', 'Dies usats', 'Pendents', 'Restants']
    const rows = [balances
      .filter(b => (b as unknown as { year: number }).year === filterYear)
      .map(b => [
        getProfileName(b.profiles),
        getProfileEmail(b.profiles),
        filterYear,
        b.total_days,
        b.used_days,
        b.pending_days,
        b.total_days - b.used_days,
      ])]
    downloadCSV(`vacances-${filterYear}.csv`, headers, rows)
    showDownloaded('vacances')
  }

  function exportClients() {
    const headers = ['Nom', 'Tipus', 'Estat', 'Valor estimat', 'Data alta', 'Últim contacte']
    const rows = [clients.map(c => [
      c.name,
      { particular: 'Particular', autonomo: 'Autònom', empresa: 'Empresa', asociacion: 'Associació' }[c.client_type] || c.client_type,
      c.status,
      c.estimated_value || 0,
      new Date(c.created_at).toLocaleDateString('ca-ES'),
      c.last_contact_at ? new Date(c.last_contact_at).toLocaleDateString('ca-ES') : 'Mai',
    ])]
    downloadCSV(`clients-${filterYear}.csv`, headers, rows)
    showDownloaded('clients')
  }

  function exportProductivitat() {
    const headers = ['Treballador', 'Cites', 'Tasques totals', 'Tasques fetes', 'Taxa compleció (%)']
    const rows = [workerStats.map(w => [w.name, w.appointments, w.tasks, w.doneTasks, w.completionRate])]
    downloadCSV(`productivitat-${filterYear}.csv`, headers, rows)
    showDownloaded('productivitat')
  }

  function exportFinancier() {
    const headers = ['Pressupost', 'Client', 'Import', 'Estat', 'Data']
    const rows = [quotes.map(q => [
      q.id.slice(0, 8),
      q.client_id,
      q.amount,
      q.status,
      new Date(q.created_at).toLocaleDateString('ca-ES'),
    ])]
    downloadCSV(`financier-${filterYear}.csv`, headers, rows)
    showDownloaded('financier')
  }

  function trend(current: number, previous: number): { icon: React.ComponentType<{ className?: string }>; color: string; text: string } {
    if (current > previous) return { icon: ArrowUpRight, color: 'text-green-500', text: `+${current - previous}` }
    if (current < previous) return { icon: ArrowDownRight, color: 'text-red-500', text: `${current - previous}` }
    return { icon: Minus, color: 'text-muted-foreground', text: '=' }
  }

  const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'resum', label: 'Resum', icon: BarChart3 },
    { id: 'vacances', label: 'Vacances', icon: Umbrella },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'productivitat', label: 'Productivitat', icon: CheckSquare },
    { id: 'financier', label: 'Financer', icon: TrendingUp },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Informes</h1>
          <p className="text-muted-foreground mt-1">Anàlisi de negoci i exportació de dades</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Any:</label>
          <select
            value={filterYear}
            onChange={e => setFilterYear(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg flex-wrap">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab: Resum */}
      {activeTab === 'resum' && (
        <div className="space-y-6">
          {/* KPIs principals */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const clientTrend = trend(stats.clientsThisMonth, stats.clientsLastMonth)
              const aptTrend = trend(stats.aptsThisMonth, stats.aptsLastMonth)
              const ClientTrendIcon = clientTrend.icon
              const AptTrendIcon = aptTrend.icon

              return [
                {
                  label: 'Clients nous (mes)',
                  value: stats.clientsThisMonth,
                  sub: <span className={`flex items-center gap-0.5 text-xs ${clientTrend.color}`}><ClientTrendIcon className="h-3 w-3" />{clientTrend.text} vs mes anterior</span>,
                  icon: Users, color: 'text-tramit-blue', bg: 'bg-tramit-blue-light dark:bg-blue-900/20',
                },
                {
                  label: 'Cites completades (mes)',
                  value: stats.aptsThisMonth,
                  sub: <span className={`flex items-center gap-0.5 text-xs ${aptTrend.color}`}><AptTrendIcon className="h-3 w-3" />{aptTrend.text} vs mes anterior</span>,
                  icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20',
                },
                {
                  label: 'Taxa retenció clients',
                  value: `${stats.retentionRate}%`,
                  sub: <span className="text-xs text-muted-foreground">{stats.activeClients} de {stats.totalClients} actius</span>,
                  icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20',
                },
                {
                  label: 'Taxa compleció tasques',
                  value: `${stats.completionRate}%`,
                  sub: <span className="text-xs text-muted-foreground">{stats.tasksCompleted} fetes de {stats.tasksCompleted + stats.tasksPending}</span>,
                  icon: CheckSquare, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20',
                },
              ].map(kpi => {
                const Icon = kpi.icon
                return (
                  <Card key={kpi.label}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">{kpi.label}</p>
                          <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                          <div className="mt-1">{kpi.sub}</div>
                        </div>
                        <div className={`p-2 rounded-lg ${kpi.bg} shrink-0`}>
                          <Icon className={`h-4 w-4 ${kpi.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            })()}
          </div>

          {/* Gràfic de cites per temàtica */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Cites per temàtica {filterYear}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {appointments.filter(a => new Date(a.start_time).getFullYear() === filterYear && a.status !== 'cancelled').length} cites totals
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {topicStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sense dades</p>
              ) : (
                <div className="space-y-2.5">
                  {topicStats.map(([topic, count]) => (
                    <div key={topic} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{topic}</span>
                        <span className="text-muted-foreground font-mono">{count}</span>
                      </div>
                      <div className="h-6 w-full bg-muted rounded-md overflow-hidden">
                        <div
                          className="h-full rounded-md bg-tramit-blue transition-all duration-500"
                          style={{ width: `${(count / maxTopicCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clients nous per mes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Clients nous per mes {filterYear}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-32">
                {clientsByMonth.map(m => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground font-mono">{m.count || ''}</span>
                    <div className="w-full bg-muted rounded-t-sm overflow-hidden" style={{ height: '80px' }}>
                      <div
                        className="w-full bg-tramit-blue rounded-t-sm transition-all duration-500"
                        style={{ height: `${(m.count / maxMonthCount) * 100}%`, marginTop: `${100 - (m.count / maxMonthCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground">{m.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Vacances */}
      {activeTab === 'vacances' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant={downloaded === 'vacances' ? 'outline' : 'tramit'}
              size="sm"
              onClick={exportVacances}
              className="flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              {downloaded === 'vacances' ? 'Descarregat ✓' : 'Exportar CSV'}
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase">Treballador</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground uppercase">Totals</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground uppercase">Usats</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground uppercase">Pendents</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground uppercase">Restants</th>
                      <th className="px-4 py-3 w-32"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {balances.map(bal => {
                      const remaining = bal.total_days - bal.used_days
                      const pct = bal.total_days > 0 ? (bal.used_days / bal.total_days) * 100 : 0
                      return (
                        <tr key={bal.user_id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{getProfileName(bal.profiles)}</td>
                          <td className="px-4 py-3 text-center">{bal.total_days}</td>
                          <td className="px-4 py-3 text-center text-tramit-blue font-semibold">{bal.used_days}</td>
                          <td className="px-4 py-3 text-center">
                            {bal.pending_days > 0 && (
                              <span className="text-amber-600 font-medium">{bal.pending_days}</span>
                            )}
                            {bal.pending_days === 0 && '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${remaining <= 3 ? 'text-red-500' : 'text-green-600'}`}>
                              {remaining}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-tramit-blue rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Clients */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant={downloaded === 'clients' ? 'outline' : 'tramit'}
              size="sm"
              onClick={exportClients}
              className="flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              {downloaded === 'clients' ? 'Descarregat ✓' : 'Exportar CSV'}
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total clients', value: clients.length },
              { label: 'Actius', value: clients.filter(c => c.status === 'active').length },
              { label: 'Prospects/Leads', value: clients.filter(c => c.status === 'prospect' || c.status === 'lead').length },
              {
                label: 'Valor pipeline total',
                value: clients.reduce((sum, c) => sum + (c.estimated_value || 0), 0).toLocaleString('ca-ES') + '€'
              },
            ].map(stat => (
              <Card key={stat.label}>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-bold text-tramit-blue">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Distribució per tipus */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Distribució per tipus de client</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {(['particular', 'autonomo', 'empresa', 'asociacion'] as const).map(type => {
                  const count = clients.filter(c => c.client_type === type).length
                  const pct = clients.length > 0 ? (count / clients.length) * 100 : 0
                  const labels = { particular: 'Particulars', autonomo: 'Autònoms', empresa: 'Empreses', asociacion: 'Associacions' }
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{labels[type]}</span>
                        <span className="text-muted-foreground">{count} ({Math.round(pct)}%)</span>
                      </div>
                      <div className="h-5 w-full bg-muted rounded-md overflow-hidden">
                        <div className="h-full bg-tramit-blue rounded-md transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Productivitat */}
      {activeTab === 'productivitat' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant={downloaded === 'productivitat' ? 'outline' : 'tramit'}
              size="sm"
              onClick={exportProductivitat}
              className="flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              {downloaded === 'productivitat' ? 'Descarregat ✓' : 'Exportar CSV'}
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase">Treballador</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground uppercase">Cites {filterYear}</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground uppercase">Tasques totals</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground uppercase">Tasques fetes</th>
                      <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground uppercase">Taxa compleció</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {workerStats.map(worker => (
                      <tr key={worker.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{worker.name}</td>
                        <td className="px-4 py-3 text-center font-semibold text-tramit-blue">{worker.appointments}</td>
                        <td className="px-4 py-3 text-center">{worker.tasks}</td>
                        <td className="px-4 py-3 text-center text-green-600 font-semibold">{worker.doneTasks}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  worker.completionRate >= 80 ? 'bg-green-500' :
                                  worker.completionRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${worker.completionRate}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium w-8 text-right">{worker.completionRate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Financer */}
      {activeTab === 'financier' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant={downloaded === 'financier' ? 'outline' : 'tramit'}
              size="sm"
              onClick={exportFinancier}
              className="flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              {downloaded === 'financier' ? 'Descarregat ✓' : 'Exportar CSV'}
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                label: 'Ingressos cobrats',
                value: quotes.filter(q => q.status === 'paid').reduce((s, q) => s + q.amount, 0),
                color: 'text-green-600',
              },
              {
                label: 'Pendent de cobrar',
                value: quotes.filter(q => ['sent', 'accepted', 'invoiced'].includes(q.status)).reduce((s, q) => s + q.amount, 0),
                color: 'text-amber-600',
              },
              {
                label: 'Pressupostos rebutjats',
                value: quotes.filter(q => q.status === 'rejected').reduce((s, q) => s + q.amount, 0),
                color: 'text-red-500',
              },
            ].map(item => (
              <Card key={item.label}>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className={`text-2xl font-bold ${item.color}`}>
                    {item.value.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Taula de pressupostos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pressupostos per estat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {(['draft', 'sent', 'accepted', 'invoiced', 'paid', 'rejected'] as const).map(status => {
                  const statusQuotes = quotes.filter(q => q.status === status)
                  const total = statusQuotes.reduce((s, q) => s + q.amount, 0)
                  const labels = {
                    draft: 'Esborranys', sent: 'Enviats', accepted: 'Acceptats',
                    invoiced: 'Facturats', paid: 'Cobrats', rejected: 'Rebutjats'
                  }
                  const colors = {
                    draft: 'text-slate-600', sent: 'text-blue-600', accepted: 'text-green-600',
                    invoiced: 'text-purple-600', paid: 'text-emerald-600', rejected: 'text-red-500'
                  }
                  if (statusQuotes.length === 0) return null
                  return (
                    <div key={status} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className={`text-sm font-semibold ${colors[status]}`}>{labels[status]}</p>
                        <p className="text-xs text-muted-foreground">{statusQuotes.length} pressupost{statusQuotes.length > 1 ? 's' : ''}</p>
                      </div>
                      <p className={`text-base font-bold ${colors[status]}`}>
                        {total.toLocaleString('ca-ES', { minimumFractionDigits: 2 })}€
                      </p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
