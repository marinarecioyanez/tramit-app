'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, Calendar, Building2, Clock, Users, Save, CheckCircle, AlertTriangle } from 'lucide-react'

interface Setting {
  id: string
  key: string
  value: string
  description: string | null
}

interface Holiday {
  id: string
  date: string
  name: string
  calendar_type: string
  year: number
}

interface Closure {
  id: string
  date: string
  name: string
  year: number
  deducts_vacation: boolean
}

interface SettingsClientProps {
  settings: Setting[]
  holidays: Holiday[]
  closures: Closure[]
}

type TabId = 'general' | 'vacances' | 'festius' | 'tancaments' | 'horari'

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'vacances', label: 'Vacances', icon: Users },
  { id: 'horari', label: 'Horari', icon: Clock },
  { id: 'festius', label: 'Festius', icon: Calendar },
  { id: 'tancaments', label: 'Tancaments', icon: Building2 },
]

const MONTH_NAMES = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des']

export function SettingsClient({ settings, holidays, closures }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const settingsMap: Record<string, string> = {}
  settings.forEach(s => { settingsMap[s.key] = s.value })

  const [values, setValues] = useState({
    max_simultaneous_vacations_2026: settingsMap['max_simultaneous_vacations_2026'] || '3',
    max_simultaneous_vacations_default: settingsMap['max_simultaneous_vacations_default'] || '2',
    default_vacation_days: settingsMap['default_vacation_days'] || '23',
    carry_over_deadline: settingsMap['carry_over_deadline'] || '15',
    working_hours_start: settingsMap['working_hours_start'] || '08:00',
    working_hours_end: settingsMap['working_hours_end'] || '17:00',
    daily_summary_time: settingsMap['daily_summary_time'] || '07:00',
    app_language: settingsMap['app_language'] || 'ca',
  })

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      for (const [key, value] of Object.entries(values)) {
        await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Error desant la configuració.')
    } finally {
      setSaving(false)
    }
  }

  const showSaveButton = activeTab === 'general' || activeTab === 'vacances' || activeTab === 'horari'

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Configuració</h1>
        <p className="text-muted-foreground mt-1">Gestiona les regles i paràmetres de l&apos;aplicació</p>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit flex-wrap">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'general' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuració general</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Idioma per defecte</Label>
              <select
                value={values.app_language}
                onChange={e => setValues(v => ({ ...v, app_language: e.target.value }))}
                className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="ca">Català</option>
                <option value="es">Castellà</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Hora del resum diari</Label>
              <Input
                type="time"
                value={values.daily_summary_time}
                onChange={e => setValues(v => ({ ...v, daily_summary_time: e.target.value }))}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">Hora a la que s&apos;envia el resum diari a les admins</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'vacances' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Regles de vacances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Dies anuals per defecte (des de 2027)</Label>
                <Input
                  type="number"
                  min="1"
                  max="40"
                  value={values.default_vacation_days}
                  onChange={e => setValues(v => ({ ...v, default_vacation_days: e.target.value }))}
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground">Dies laborables per treballador</p>
              </div>
              <div className="space-y-1.5">
                <Label>Dia límit d&apos;arrossegament (gener)</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={values.carry_over_deadline}
                  onChange={e => setValues(v => ({ ...v, carry_over_deadline: e.target.value }))}
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground">Fins quin dia de gener es poden gastar dies pendents</p>
              </div>
            </div>
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-semibold">Límit de treballadors simultanis</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Màxim simultani 2026</Label>
                  <Input
                    type="number"
                    min="1"
                    max="8"
                    value={values.max_simultaneous_vacations_2026}
                    onChange={e => setValues(v => ({ ...v, max_simultaneous_vacations_2026: e.target.value }))}
                    className="w-24"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Màxim simultani des de 2027</Label>
                  <Input
                    type="number"
                    min="1"
                    max="8"
                    value={values.max_simultaneous_vacations_default}
                    onChange={e => setValues(v => ({ ...v, max_simultaneous_vacations_default: e.target.value }))}
                    className="w-24"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'horari' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Horari laboral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 max-w-xs">
              <div className="space-y-1.5">
                <Label>Hora d&apos;inici</Label>
                <Input
                  type="time"
                  value={values.working_hours_start}
                  onChange={e => setValues(v => ({ ...v, working_hours_start: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hora de fi</Label>
                <Input
                  type="time"
                  value={values.working_hours_end}
                  onChange={e => setValues(v => ({ ...v, working_hours_end: e.target.value }))}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Les cites fora d&apos;aquest horari requeriran confirmació manual.
            </p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'festius' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Festius no laborables 2026</CardTitle>
          </CardHeader>
          <CardContent>
            {holidays.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No hi ha festius carregats</p>
            ) : (
              <div className="space-y-2">
                {holidays.map(holiday => {
                  const date = new Date(holiday.date + 'T12:00:00')
                  return (
                    <div key={holiday.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="text-center bg-tramit-blue text-white rounded-lg p-2 min-w-[48px]">
                        <div className="text-xs font-medium">{MONTH_NAMES[date.getMonth()]}</div>
                        <div className="text-lg font-bold leading-none">{date.getDate()}</div>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{holiday.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{holiday.calendar_type}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-4">Per modificar festius contacta amb el suport tècnic.</p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'tancaments' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tancaments d&apos;empresa</CardTitle>
          </CardHeader>
          <CardContent>
            {closures.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No hi ha tancaments configurats</p>
            ) : (
              <div className="space-y-2">
                {closures.map(closure => {
                  const date = new Date(closure.date + 'T12:00:00')
                  return (
                    <div key={closure.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="text-center bg-slate-600 text-white rounded-lg p-2 min-w-[48px]">
                          <div className="text-xs font-medium">{MONTH_NAMES[date.getMonth()]}</div>
                          <div className="text-lg font-bold leading-none">{date.getDate()}</div>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{closure.name}</p>
                          <p className="text-xs text-muted-foreground">Any {closure.year}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        closure.deducts_vacation
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {closure.deducts_vacation ? 'Descompte vacances' : 'Sense descompte'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showSaveButton && (
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} variant="tramit" disabled={saving} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Desant...' : 'Desar canvis'}
          </Button>
          {saved && (
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Desat correctament</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-1.5 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
