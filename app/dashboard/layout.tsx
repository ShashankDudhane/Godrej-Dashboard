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
    LayersIcon,
    ClipboardCheck,
    AlertTriangle,
    LogOut,
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
    { href: "/dashboard/steel-stock-report", label: "Steel Stock Report", icon: <LayersIcon className="h-5 w-5 stroke-yellow-500" /> },
    { href: "/dashboard/tower-finish-dates", label: "Tower Finish Dates", icon: <LayersIcon className="h-5 w-5 stroke-red-500" /> },
    { href: "/dashboard/non-negotiables", label: "Non-Negotiables", icon: <ClipboardCheck className="h-5 w-5 stroke-green-600" /> },
    { href: "/dashboard/critical-issues", label: "Critical Issues", icon: <AlertTriangle className="h-5 w-5 stroke-red-600" /> },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const [collapsed, setCollapsed] = useState(false)
    const { user, signOut } = useAuth()

    return (
        <div className="flex min-h-screen w-full bg-blue-50">
            {/* Sidebar */}
            <aside
                className={`inset-y-0 left-0 hidden flex-col border-r border-sky-100 bg-white shadow-xl md:flex ${
                    collapsed ? "w-16" : "w-64"
                } transition-all duration-300 ease-in-out`}
            >
                <div className="relative h-16 flex items-center justify-between px-4 border-b border-sky-100 bg-sky-50/70">
                    {!collapsed && (
                        <div className="flex items-center space-x-3 overflow-hidden">
                            {/* Logo */}
                            <span className="bg-sky-600 text-white text-sm font-extrabold px-2 py-0.5 rounded-md flex-shrink-0">
                                GEW
                            </span>
                            {/* Title (nowrap, no truncation unless overflow) */}
                            <h1 className="text-lg font-extrabold text-sky-700 tracking-wide whitespace-nowrap flex-shrink-0">
                                Godrej Emerald Waters
                            </h1>
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-sky-100 text-sky-600"
                        onClick={() => setCollapsed(!collapsed)}
                        title={collapsed ? "Expand Menu" : "Collapse Menu"}
                    >
                        {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                    </Button>
                </div>

                <nav className="flex flex-col gap-1 px-3 py-4 overflow-y-auto">
                    {navItems.map((item, index) => {
                        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                        return (
                            <Link
                                key={index}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 
                                    ${
                                        isActive
                                            ? "bg-sky-100 text-sky-800 shadow-md border-l-4 border-sky-500"
                                            : "text-gray-600 hover:bg-sky-50 hover:text-sky-600"
                                    }
                                    ${collapsed ? "justify-center" : ""}
                                `}
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
                {/* Topbar (not sticky anymore) */}
                <header className="flex h-16 items-center justify-between border-b border-sky-100 bg-white px-6 shadow-sm">
                    <h2 className="text-xl font-bold text-sky-600">
                        {navItems.find((item) => pathname.startsWith(item.href))?.label || "Dashboard"}
                    </h2>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                            Hi, {user?.email ?? "Guest"}
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={signOut}
                            className="text-gray-700 border-gray-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign Out
                        </Button>
                    </div>
                </header>

                <main className="flex-1 p-6 bg-blue-50">{children}</main>
            </div>
        </div>
    )
}
