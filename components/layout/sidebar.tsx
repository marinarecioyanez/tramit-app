'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Calendar, Umbrella, Users,
  BarChart3, Settings, Home, LogOut,
  UserCircle, BookOpen, MessageSquare,
  CheckSquare, FileText,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { TramitLogo } from './logo'
import type { Profile } from '@/types'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const adminNavItems: NavItem[] = [
  { label: 'Tauler',          href: '/dashboard',                icon: LayoutDashboard },
  { label: 'Missatges',       href: '/dashboard/missatges',      icon: MessageSquare },
  { label: 'Agenda',          href: '/dashboard/agenda',         icon: Calendar },
  { label: 'Equip',           href: '/dashboard/equip',          icon: Umbrella },
  { label: 'Clients',         href: '/dashboard/clients',        icon: Users },
  { label: 'Tasques',         href: '/dashboard/tasques',        icon: CheckSquare },
  { label: 'Documents',       href: '/dashboard/documents',      icon: FileText },
  { label: 'Informes',        href: '/dashboard/informes',       icon: BarChart3 },
  { label: 'Assessor Tràmit', href: '/dashboard/assessor',       icon: BookOpen },
  { label: 'Administració',   href: '/dashboard/administracio',  icon: Settings },
]

const workerNavItems: NavItem[] = [
  { label: 'Inici',     href: '/worker',           icon: Home },
  { label: 'Missatges', href: '/worker/missatges',  icon: MessageSquare },
  { label: 'Agenda',    href: '/worker/agenda',     icon: Calendar },
  { label: 'Equip',     href: '/worker/equip',      icon: Users },
  { label: 'El meu perfil', href: '/worker/perfil', icon: UserCircle },
]

interface SidebarProps {
  profile: Profile
  onSignOut: () => void
  onNavigate?: () => void
}

export function Sidebar({ profile, onSignOut, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const isAdmin = profile.role === 'admin' || profile.role === 'supervisor'
  const navItems = isAdmin ? adminNavItems : workerNavItems
  const initials = getInitials(profile.full_name || '')

  return (
    <aside className="w-[220px] h-screen flex flex-col bg-tramit-blue-dark text-white">
      <div className="flex items-center justify-center py-5 px-4 border-b border-white/10">
        <TramitLogo size="sm" />
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' &&
                item.href !== '/worker' &&
                pathname.startsWith(item.href))

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2 px-2 py-2 mb-1">
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: profile.color || '#ffffff33' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{profile.full_name}</p>
            <p className="text-[10px] text-white/50 truncate capitalize">{profile.role}</p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/10 rounded-md transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Tancar sessió
        </button>
      </div>
    </aside>
  )
}
