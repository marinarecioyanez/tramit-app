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
    <header className="fixed top-0 left-[220px] right-0 h-14 bg-background border-b border-border flex items-center justify-between px-6 z-30">
      <p className="text-sm text-muted-foreground capitalize">{today}</p>

      <div className="flex items-center gap-1">
        <NotificationsBell />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Canviar tema"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </header>
  )
}
