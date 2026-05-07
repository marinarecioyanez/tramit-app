'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { NotificationsBell } from './notifications-bell'
import { GlobalSearch } from './global-search'

export function Header() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center justify-between w-full gap-4">
      <GlobalSearch />

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
