import { createClient } from '@/lib/supabase/server'
import { getGreeting, formatDateCA } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Umbrella,
  CheckCircle,
  Calendar,
  Plus,
  Eye,
  Clock,
} from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Inici — Tràmit Economistes',
}

export default async function WorkerPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  // Get vacation balance for current year
  const currentYear = new Date().getFullYear()
  const { data: balance } = await supabase
    .from('vacation_balances')
    .select('*')
    .eq('user_id', user!.id)
    .eq('year', currentYear)
    .single()

  // Get next appointment
  const now = new Date().toISOString()
  const { data: nextAppointment } = await supabase
    .from('appointments')
    .select('start_time, topic, channel')
    .eq('main_attendee_id', user!.id)
    .gt('start_time', now)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true })
    .limit(1)
    .single()

  const greeting = getGreeting()
  const firstName = profile?.full_name?.split(' ')[0] || ''

  const summaryCards = [
    {
      title: 'Dies disponibles',
      value: balance?.remaining_days ?? '—',
      subtitle: `de ${balance?.total_days ?? '—'} dies totals`,
      icon: Umbrella,
      color: 'text-tramit-blue',
      bg: 'bg-tramit-blue-light dark:bg-blue-900/20',
    },
    {
      title: 'Dies aprovats',
      value: balance?.used_days ?? '—',
      subtitle: `i ${balance?.pending_days ?? 0} pendents d'aprovació`,
      icon: CheckCircle,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: 'Propera cita',
      value: nextAppointment
        ? new Date(nextAppointment.start_time).toLocaleDateString('ca-ES', {
            day: '2-digit',
            month: 'short',
          })
        : '—',
      subtitle: nextAppointment
        ? new Date(nextAppointment.start_time).toLocaleTimeString('ca-ES', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Cap cita propera',
      icon: Calendar,
      color: 'text-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {card.title}
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                      {card.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {card.subtitle}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${card.bg}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="tramit">
          <Link href="/worker/vacances/nova">
            <Plus className="h-4 w-4" />
            Sol·licitar vacances
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/worker/agenda">
            <Eye className="h-4 w-4" />
            Veure agenda
          </Link>
        </Button>
      </div>

      {/* Recent requests */}
      <Card>
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold text-base">Les meves sol·licituds recents</h2>
        </div>
        <CardContent className="pt-4">
          <RecentRequests userId={user!.id} />
        </CardContent>
      </Card>
    </div>
  )
}

async function RecentRequests({ userId }: { userId: string }) {
  const supabase = createClient()

  const { data: requests } = await supabase
    .from('absence_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (!requests || requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Cap sol·licitud recent</p>
        <p className="text-xs mt-1">
          Utilitza el botó &ldquo;Sol·licitar vacances&rdquo; per enviar la primera
        </p>
      </div>
    )
  }

  const statusLabels: Record<string, string> = {
    pending: 'Pendent',
    approved: 'Aprovada',
    rejected: 'Rebutjada',
    cancelled: 'Cancel·lada',
  }

  const statusStyles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }

  return (
    <ul className="space-y-2">
      {requests.map((req: {
        id: string;
        type: string;
        start_date: string;
        end_date: string;
        working_days?: number;
        status: string;
      }) => {
        const typeLabels: Record<string, string> = {
          vacation: 'Vacances',
          sick_leave: 'Baixa mèdica',
          permission: 'Permís',
          other: 'Altre',
        }

        return (
          <li
            key={req.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
          >
            <div>
              <p className="text-sm font-medium">{typeLabels[req.type] || req.type}</p>
              <p className="text-xs text-muted-foreground">
                {req.start_date} → {req.end_date}
                {req.working_days ? ` · ${req.working_days} dies laborables` : ''}
              </p>
            </div>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyles[req.status] || statusStyles.pending}`}
            >
              {statusLabels[req.status] || req.status}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
