export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getGreeting, formatDateCA } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Umbrella, CheckCircle, Calendar, Plus,
  Eye, Clock, ChevronRight, AlertCircle
} from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Inici — Tràmit Economistes' }

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendent',
  approved: 'Aprovada',
  rejected: 'Rebutjada',
  cancelled: 'Cancel·lada',
}

const TYPE_LABELS: Record<string, string> = {
  vacation: 'Vacances',
  sick_leave: 'Baixa mèdica',
  permission: 'Permís',
  other: 'Altre',
}

export default async function WorkerPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, color')
    .eq('id', user!.id)
    .single()

  const currentYear = new Date().getFullYear()

  // Saldo de vacances
  const { data: balance } = await supabase
    .from('vacation_balances')
    .select('*')
    .eq('user_id', user!.id)
    .eq('year', currentYear)
    .single()

  // Sol·licituds recents
  const { data: requests } = await supabase
    .from('absence_requests')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Properes absències aprovades
  const today = new Date().toISOString().split('T')[0]
  const { data: upcoming } = await supabase
    .from('absence_requests')
    .select('*')
    .eq('user_id', user!.id)
    .eq('status', 'approved')
    .gte('end_date', today)
    .order('start_date', { ascending: true })
    .limit(3)

  // Companys de vacances avui
  const { data: todayAbsences } = await supabase
    .from('absence_requests')
    .select('*, profiles!absence_requests_user_id_fkey(full_name, color)')
    .eq('status', 'approved')
    .lte('start_date', today)
    .gte('end_date', today)
    .neq('user_id', user!.id)

  const greeting = getGreeting()
  const firstName = profile?.full_name?.split(' ')[0] || ''
  const remaining = balance ? balance.total_days - balance.used_days : 0
  const pendingRequests = requests?.filter(r => r.status === 'pending') || []

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Salutació */}
      <div>
        <h1 className="text-2xl font-bold">{greeting}, {firstName} 👋</h1>
        <p className="text-muted-foreground mt-1 capitalize">{formatDateCA(new Date())}</p>
      </div>

      {/* Alertes */}
      {pendingRequests.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-400">
            Tens <strong>{pendingRequests.length} sol·licitud{pendingRequests.length > 1 ? 's' : ''}</strong> pendent{pendingRequests.length > 1 ? 's' : ''} d&apos;aprovació.
          </p>
        </div>
      )}

      {/* Targetes de saldo */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex justify-center mb-2">
              <div className="p-2 rounded-lg bg-tramit-blue-light dark:bg-blue-900/20">
                <Umbrella className="h-5 w-5 text-tramit-blue" />
              </div>
            </div>
            <p className={`text-3xl font-bold ${remaining <= 3 ? 'text-red-500' : 'text-tramit-blue'}`}>
              {remaining}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Dies disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex justify-center mb-2">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-green-600">{balance?.used_days ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Dies aprovats</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex justify-center mb-2">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-500">{balance?.pending_days ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Dies pendents</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de progrés del saldo */}
      {balance && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Saldo de vacances {currentYear}</p>
              <p className="text-sm text-muted-foreground">
                {balance.used_days} de {balance.total_days} dies usats
              </p>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-tramit-blue transition-all"
                style={{ width: `${Math.min(100, (balance.used_days / balance.total_days) * 100)}%` }}
              />
            </div>
            {balance.carry_over_days > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                + {balance.carry_over_days} dies arrossegats de l&apos;any anterior
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Accions ràpides */}
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="tramit">
          <Link href="/worker/vacances/nova" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Sol·licitar vacances
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/worker/agenda" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Veure agenda
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/worker/vacances" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Les meves vacances
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Properes absències */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Les meves properes absències</CardTitle>
          </CardHeader>
          <CardContent>
            {!upcoming || upcoming.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Cap absència propera aprovada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming.map(req => {
                  const start = new Date(req.start_date)
                  const isActive = req.start_date <= today && req.end_date >= today
                  return (
                    <div key={req.id} className={`p-3 rounded-lg ${isActive ? 'bg-tramit-blue-light dark:bg-blue-900/20 border border-tramit-blue/20' : 'bg-muted/50'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {isActive && <span className="text-tramit-blue font-bold mr-1">Ara · </span>}
                            {TYPE_LABELS[req.type]}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {req.start_date === req.end_date
                              ? req.start_date
                              : `${req.start_date} → ${req.end_date}`
                            }
                            {' · '}{req.working_days} dies
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-tramit-blue">{start.getDate()}</p>
                          <p className="text-xs text-muted-foreground">{start.toLocaleDateString('ca-ES', { month: 'short' })}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <Link href="/worker/vacances" className="flex items-center gap-1 text-xs text-tramit-blue hover:underline mt-1">
                  Veure totes <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Qui no hi és avui */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Companys absents avui</CardTitle>
          </CardHeader>
          <CardContent>
            {!todayAbsences || todayAbsences.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Tot l&apos;equip disponible avui</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayAbsences.map(abs => {
                  const absProfile = abs.profiles as { full_name: string; color: string | null } | null
                  const color = absProfile?.color || '#2272A3'
                  const initials = absProfile?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
                  return (
                    <div key={abs.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {abs.type === 'sick_leave' ? 'No disponible' : absProfile?.full_name || '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {abs.type === 'vacation' ? 'Vacances' : 'Absència'}
                          {' · '}fins {abs.end_date}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sol·licituds recents */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Sol·licituds recents</CardTitle>
            <Link href="/worker/vacances" className="text-xs text-tramit-blue hover:underline flex items-center gap-1">
              Veure totes <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {!requests || requests.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Cap sol·licitud recent</p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{TYPE_LABELS[req.type]}</p>
                    <p className="text-xs text-muted-foreground">
                      {req.start_date === req.end_date
                        ? req.start_date
                        : `${req.start_date} → ${req.end_date}`
                      }
                      {' · '}{req.working_days} dies
                    </p>
                    {req.admin_note && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">&ldquo;{req.admin_note}&rdquo;</p>
                    )}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[req.status]}`}>
                    {STATUS_LABELS[req.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
