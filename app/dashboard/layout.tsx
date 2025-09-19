"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import {
  HomeIcon,
  BriefcaseIcon,
  Users2,
  TicketCheck,
  PanelLeft,
  LogsIcon,
  ReceiptIndianRupeeIcon,
  GaugeIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: <HomeIcon className="h-5 w-5 stroke-sky-500" /> },
  { href: "/dashboard/hindrances-inputs", label: "Hindrances & Inputs", icon: <BriefcaseIcon className="h-5 w-5 stroke-green-500" /> },
  { href: "/dashboard/drawings", label: "Drawings", icon: <Users2 className="h-5 w-5 stroke-cyan-500" /> },
  { href: "/dashboard/approval", label: "Approval", icon: <TicketCheck className="h-5 w-5 stroke-cyan-700" /> },
  { href: "/dashboard/concrete", label: "Concrete", icon: <PanelLeft className="h-5 w-5 stroke-fuchsia-700" /> },
  { href: "/dashboard/planvsactual", label: "Plan vs Actual", icon: <LogsIcon className="h-5 w-5 stroke-cyan-700" /> },
  { href: "/dashboard/manpower", label: "Manpower", icon: <GaugeIcon className="h-5 w-5 stroke-fuchsia-500" /> },
  { href: "/dashboard/cashflow", label: "Cash Flow", icon: <ReceiptIndianRupeeIcon className="h-5 w-5 stroke-green-500" /> },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { user, signOut } = useAuth()

  return (
    <div className="flex min-h-screen w-full bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside
        className={`inset-y-0 left-0 hidden flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg md:flex ${
          collapsed ? "max-w-[4rem]" : "max-w-72"
        } transition-all duration-300`}
      >
        <div className="relative h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          {!collapsed && <h1 className="text-xl font-bold text-gray-900 dark:text-white">Godrej Emerald Waters</h1>}
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex flex-col gap-1 px-2 py-4">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            return (
              <Link
                key={index}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur px-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Dashboard</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Hey, {user?.email ?? "Guest"}
            </span>
            <Button size="sm" variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">{children}</main>
      </div>
    </div>
  )
}
