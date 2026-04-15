import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard, Briefcase, FileText, Users,
  LogOut, ChevronLeft, ChevronRight, Bell,
  Search, TrendingUp, Zap, UserCircle,
} from "lucide-react";
import { useApp } from "../../AppContext";

const navItems = [
  { to: "/freelancer/dashboard",   icon: LayoutDashboard, label: "Dashboard"   },
  { to: "/freelancer/marketplace", icon: Briefcase,       label: "Marketplace" },
  { to: "/freelancer/projects",    icon: TrendingUp,      label: "My Projects" },
  { to: "/freelancer/invoices",    icon: FileText,        label: "Invoices"    },
  { to: "/freelancer/clients",     icon: Users,           label: "Clients"     },
  { to: "/freelancer/profile",     icon: UserCircle,      label: "My Profile"  },
];

export function FreelancerLayout() {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className={`relative flex flex-col bg-[#0f172a] text-white transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-white" />
          </div>
          {!collapsed && <span className="text-white font-semibold tracking-wide text-sm">FreelanceFlow</span>}
        </div>

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-16 z-10 w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md hover:bg-indigo-600 transition-colors">
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
            {user?.avatar}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
              <p className="text-white/40 text-xs">Freelancer</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm ${
                  isActive
                    ? "bg-indigo-500/20 text-indigo-400 font-medium"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`
              }>
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? "text-indigo-400" : ""} />
                  {!collapsed && <span>{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-2 py-4 border-t border-white/10">
          <button onClick={() => { logout(); navigate("/"); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm">
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search projects, clients..."
              className="pl-9 pr-4 py-1.5 text-sm bg-gray-100 rounded-lg border-0 outline-none w-64 focus:ring-2 focus:ring-indigo-200 transition-all" />
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Bell size={18} className="text-gray-600" />
            </button>
            <NavLink to="/freelancer/profile"
              className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-semibold hover:bg-indigo-600 transition-colors">
              {user?.avatar}
            </NavLink>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto"><Outlet /></main>
      </div>
    </div>
  );
}
