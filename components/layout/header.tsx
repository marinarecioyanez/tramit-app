'use client'

import { Bell, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { formatDateCA } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  notificationCount?: number
}

export function Header({ notificationCount = 0 }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const today = formatDateCA(new Date())

  return (
    <header className="fixed top-0 left-[220px] right-0 h-14 bg-background border-b border-border flex items-center justify-between px-6 z-30">
      {/* Date */}
      <p className="text-sm text-muted-foreground capitalize">{today}</p>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notificacions"
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </Button>

        {/* Theme toggle */}
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
