'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  Umbrella,
  Users,
  FileText,
  BarChart3,
  Settings,
  ClipboardList,
  Home,
  LogOut,
  UserCircle,
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
  { label: 'Tauler', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Agenda', href: '/dashboard/agenda', icon: Calendar },
  { label: 'Vacances', href: '/dashboard/vacances', icon: Umbrella },
  { label: 'Absències', href: '/dashboard/absencies', icon: ClipboardList },
  { label: 'Clients', href: '/dashboard/clients', icon: Users },
  { label: 'Informes', href: '/dashboard/informes', icon: BarChart3 },
  { label: 'Usuaris', href: '/dashboard/usuaris', icon: UserCircle },
  { label: 'Configuració', href: '/dashboard/configuracio', icon: Settings },
  { label: 'Auditoria', href: '/dashboard/auditoria', icon: FileText },
]

const workerNavItems: NavItem[] = [
  { label: 'Inici', href: '/worker', icon: Home },
  { label: 'Agenda', href: '/worker/agenda', icon: Calendar },
  { label: 'Vacances', href: '/worker/vacances', icon: Umbrella },
]

interface SidebarProps {
  profile: Profile
  onSignOut: () => void
}

export function Sidebar({ profile, onSignOut }: SidebarProps) {
  const pathname = usePathname()
  const isAdmin = profile.role === 'admin'
  const navItems = isAdmin ? adminNavItems : workerNavItems

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] flex flex-col bg-tramit-blue-dark text-white z-40">
      {/* Logo */}
      <div className="flex items-center justify-center py-5 px-4 border-b border-white/10">
        <TramitLogo size="sm" />
      </div>

      {/* Navigation */}
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

      {/* User section */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              getInitials(profile.full_name)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {profile.full_name}
            </p>
            <p className="text-xs text-white/50 truncate">{profile.email}</p>
          </div>
        </div>
        <div className="mt-1 space-y-1">
          <Link
            href={isAdmin ? '/dashboard/perfil' : '/worker/perfil'}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <UserCircle className="h-3.5 w-3.5" />
            El meu perfil
          </Link>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Tancar sessió
          </button>
        </div>
      </div>
    </aside>
  )
}
