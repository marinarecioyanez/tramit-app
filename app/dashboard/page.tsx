import { createClient } from '@/lib/supabase/server'
import { getGreeting, formatDateCA } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  Calendar,
  Umbrella,
  UserX,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'

export const metadata = {
  title: 'Tauler — Tràmit Economistes',
}

async function getDashboardData() {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  // Pending vacation requests
  const { data: pendingVacations, count: pendingVacationsCount } = await supabase
    .from('absence_requests')
    .select('*, profiles(full_name)', { count: 'exact' })
    .eq('status', 'pending')
    .eq('type', 'vacation')
    .order('created_at', { ascending: false })
    .limit(5)

  // Today's appointments
  const { data: todayAppointments, count: todayAppointmentsCount } = await supabase
    .from('appointments')
    .select('*, profiles!appointments_main_attendee_id_fkey(full_name)', { count: 'exact' })
    .gte('start_time', `${today}T00:00:00`)
    .lte('start_time', `${today}T23:59:59`)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true })
    .limit(5)

  // Vacations today
  const { count: vacationsTodayCount } = await supabase
    .from('absence_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .eq('type', 'vacation')
    .lte('start_date', today)
    .gte('end_date', today)

  // Unavailable today (sick leave / other)
  const { count: unavailableTodayCount } = await supabase
    .from('absence_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .neq('type', 'vacation')
    .lte('start_date', today)
    .gte('end_date', today)

  return {
    pendingVacations: pendingVacations || [],
    pendingVacationsCount: pendingVacationsCount || 0,
    todayAppointments: todayAppointments || [],
    todayAppointmentsCount: todayAppointmentsCount || 0,
    vacationsTodayCount: vacationsTodayCount || 0,
    unavailableTodayCount: unavailableTodayCount || 0,
  }
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  const data = await getDashboardData()
  const greeting = getGreeting()
  const firstName = profile?.full_name?.split(' ')[0] || 'Administradora'

  const summaryCards = [
    {
      title: 'Sol·licituds pendents',
      value: data.pendingVacationsCount,
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      urgent: data.pendingVacationsCount > 0,
    },
    {
      title: 'Cites avui',
      value: data.todayAppointmentsCount,
      icon: Calendar,
      color: 'text-tramit-blue',
      bg: 'bg-tramit-blue-light dark:bg-blue-900/20',
      urgent: false,
    },
    {
      title: 'De vacances avui',
      value: data.vacationsTodayCount,
      icon: Umbrella,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-900/20',
      urgent: false,
    },
    {
      title: 'No disponibles avui',
      value: data.unavailableTodayCount,
      icon: UserX,
      color: 'text-slate-500',
      bg: 'bg-slate-50 dark:bg-slate-800',
      urgent: false,
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-muted-foreground mt-1 capitalize">
          {formatDateCA(new Date())}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="relative overflow-hidden">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {card.title}
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                      {card.value}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${card.bg}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
                {card.urgent && card.value > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <AlertCircle className="h-3 w-3 text-amber-500" />
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      Requereix atenció
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Two columns: pending requests + today's appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pending vacation requests */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Sol·licituds pendents
              </CardTitle>
              {data.pendingVacationsCount > 0 && (
                <Badge variant="pending">{data.pendingVacationsCount}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {data.pendingVacations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Cap sol·licitud pendent</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {data.pendingVacations.map((req: {
                  id: string;
                  profiles?: { full_name?: string } | null;
                  start_date: string;
                  end_date: string;
                  working_days?: number;
                }) => (
                  <li
                    key={req.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {(req.profiles as { full_name?: string } | null)?.full_name || '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {req.start_date} → {req.end_date}
                        {req.working_days ? ` · ${req.working_days} dies` : ''}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Today's appointments */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Cites d&apos;avui
              </CardTitle>
              {data.todayAppointmentsCount > 0 && (
                <Badge>{data.todayAppointmentsCount}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {data.todayAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Cap cita programada per avui</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {data.todayAppointments.map((apt: {
                  id: string;
                  start_time: string;
                  end_time: string;
                  topic: string;
                  channel: string;
                  profiles?: { full_name?: string } | null;
                }) => {
                  const startTime = new Date(apt.start_time).toLocaleTimeString('ca-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  const endTime = new Date(apt.end_time).toLocaleTimeString('ca-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  return (
                    <li
                      key={apt.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {startTime} – {endTime}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(apt.profiles as { full_name?: string } | null)?.full_name || '—'} · {apt.channel}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
