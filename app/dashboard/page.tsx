export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getGreeting, formatDateCA } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Clock, Calendar, Umbrella, UserX,
  ChevronRight, AlertCircle, TrendingUp,
  Users, CheckCircle, XCircle
} from 'lucide-react'
import Link from 'next/link'
import { AppointmentsChart } from '@/components/features/appointments-chart'

export const metadata = { title: 'Tauler — Tràmit Economistes' }

const TOPIC_LABELS: Record<string, string> = {
  fiscal: 'Fiscal',
  labor: 'Laboral',
  accounting: 'Comptable',
  income_tax: 'Renda',
  freelance: 'Autònoms',
  companies: 'Societats',
  internal_meeting: 'Reunió interna',
  client_query: 'Consulta client',
  documentation: 'Documentació',
  other: 'Altre',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export default async function DashboardPage() {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const currentYear = new Date().getFullYear()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  // Sol·licituds pendents
  const { data: pendingRequests, count: pendingCount } = await supabase
    .from('absence_requests')
    .select('id, type, start_date, end_date, working_days, profiles!absence_requests_user_id_fkey(full_name, color)', { count: 'exact' })
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5)

  // Cites avui
  const { count: todayAppointmentsCount } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .gte('start_time', `${today}T00:00:00`)
    .lte('start_time', `${today}T23:59:59`)
    .neq('status', 'cancelled')

  // Vacances avui
  const { data: vacancesAvui, count: vacationsTodayCount } = await supabase
    .from('absence_requests')
    .select('id, profiles!absence_requests_user_id_fkey(full_name, color)', { count: 'exact' })
    .eq('status', 'approved')
    .eq('type', 'vacation')
    .lte('start_date', today)
    .gte('end_date', today)

  // No disponibles avui
  const { data: noDisponiblesAvui, count: unavailableCount } = await supabase
    .from('absence_requests')
    .select('id, type, profiles!absence_requests_user_id_fkey(full_name, color)', { count: 'exact' })
    .eq('status', 'approved')
    .neq('type', 'vacation')
    .lte('start_date', today)
    .gte('end_date', today)

  // Total treballadors actius
  const { count: totalWorkers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'worker')
    .eq('active', true)

  // Total clients
  const { count: totalClients } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })

  // Aprovades aquest mes
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const { count: approvedThisMonth } = await supabase
    .from('absence_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .gte('approved_at', firstOfMonth)

  // Rebutjades aquest mes
  const { count: rejectedThisMonth } = await supabase
    .from('absence_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'rejected')
    .gte('updated_at', firstOfMonth)

  // Cites per temàtica (últims 90 dies)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const { data: appointmentsByTopic } = await supabase
    .from('appointments')
    .select('topic')
    .gte('created_at', ninetyDaysAgo.toISOString())
    .neq('status', 'cancelled')

  const topicCounts: Record<string, number> = {}
  appointmentsByTopic?.forEach(apt => {
    const label = TOPIC_LABELS[apt.topic] || apt.topic
    topicCounts[label] = (topicCounts[label] || 0) + 1
  })
  const chartData = Object.entries(topicCounts)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)

  // Saldos vacances — qui té menys dies
  const { data: lowBalances } = await supabase
    .from('vacation_balances')
    .select('*, profiles!vacation_balances_user_id_fkey(full_name, color)')
    .eq('year', currentYear)
    .order('used_days', { ascending: false })
    .limit(4)

  const greeting = getGreeting()
  const firstName = profile?.full_name?.split(' ')[0] || 'Marina'

  const summaryCards = [
    {
      title: 'Sol·licituds pendents',
      value: pendingCount || 0,
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      urgent: (pendingCount || 0) > 0,
      href: '/dashboard/vacances',
    },
    {
      title: 'Cites avui',
      value: todayAppointmentsCount || 0,
      icon: Calendar,
      color: 'text-tramit-blue',
      bg: 'bg-tramit-blue-light dark:bg-blue-900/20',
      urgent: false,
      href: '/dashboard/agenda',
    },
    {
      title: 'De vacances avui',
      value: vacationsTodayCount || 0,
      icon: Umbrella,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-900/20',
      urgent: false,
      href: '/dashboard/vacances',
    },
    {
      title: 'No disponibles avui',
      value: unavailableCount || 0,
      icon: UserX,
      color: 'text-slate-500',
      bg: 'bg-slate-50 dark:bg-slate-800',
      urgent: false,
      href: '/dashboard/absencies',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Salutació */}
      <div>
        <h1 className="text-2xl font-bold">{greeting}, {firstName} 👋</h1>
        <p className="text-muted-foreground mt-1 capitalize">{formatDateCA(new Date())}</p>
      </div>

      {/* Alerta si hi ha pendents */}
      {(pendingCount || 0) > 0 && (
        <Link href="/dashboard/vacances">
          <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors cursor-pointer">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-400">
              Tens <strong>{pendingCount} sol·licitud{(pendingCount || 0) > 1 ? 's' : ''}</strong> pendent{(pendingCount || 0) > 1 ? 's' : ''} d&apos;aprovació. Clica per revisar-les.
            </p>
            <ChevronRight className="h-4 w-4 text-amber-500 ml-auto shrink-0" />
          </div>
        </Link>
      )}

      {/* Targetes principals */}
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

      {/* Estadístiques secundàries */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Treballadors actius', value: totalWorkers || 0, icon: Users, color: 'text-purple-500' },
          { label: 'Clients registrats', value: totalClients || 0, icon: Users, color: 'text-tramit-blue' },
          { label: 'Aprovades aquest mes', value: approvedThisMonth || 0, icon: CheckCircle, color: 'text-green-500' },
          { label: 'Rebutjades aquest mes', value: rejectedThisMonth || 0, icon: XCircle, color: 'text-red-500' },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${stat.color} shrink-0`} />
                  <div>
                    <p className="text-xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground leading-tight">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Fila principal: gràfic + pendents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Gràfic de cites */}
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

        {/* Sol·licituds pendents */}
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
                  id: string
                  type: string
                  profiles?: { full_name?: string; color?: string } | { full_name?: string; color?: string }[] | null
                  start_date: string
                  end_date: string
                  working_days?: number
                }) => {
