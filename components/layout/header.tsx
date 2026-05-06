'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { formatDateCA } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { NotificationsBell } from './notifications-bell'

export function Header() {
  const { theme, setTheme } = useTheme()
  const today = formatDateCA(new Date())

  return (
    <div className="flex items-center justify-between w-full">
      <p className="text-sm text-muted-foreground capitalize hidden sm:block">{today}</p>

      <div className="flex items-center gap-1 ml-auto">
        <NotificationsBell />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Canviar tema"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
