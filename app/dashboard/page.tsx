import { createClient } from '@/lib/supabase/server'
import { getGreeting } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, Calendar, Umbrella, UserX } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createClient()

  let firstName = 'Marina'
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      firstName = profile?.full_name?.split(' ')[0] || 'Marina'
    }
  } catch {
    // continua amb valor per defecte
  }

  const greeting = getGreeting()

  const summaryCards = [
    { title: 'Sol·licituds pendents', value: 0, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { title: 'Cites avui', value: 0, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { title: 'De vacances avui', value: 0, icon: Umbrella, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    { title: 'No disponibles avui', value: 0, icon: UserX, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{greeting}, {firstName} 👋</h1>
        <p className="text-muted-foreground mt-1">Benvinguda al tauler de Tràmit Economistes</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{card.title}</p>
                    <p className="text-3xl font-bold">{card.value}</p>
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

      <Card>
        <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
          <p className="text-sm">🚀 Base tècnica llesta. Les properes fases afegiran les dades reals.</p>
        </CardContent>
      </Card>
    </div>
  )
}
