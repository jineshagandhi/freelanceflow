import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard, PlusCircle, FileText, Inbox,
  LogOut, Zap, Bell, Gavel, UserCircle, History,
} from "lucide-react";
import { useApp } from "../../AppContext";

const navItems = [
  { to: "/client/dashboard",      icon: LayoutDashboard, label: "My Dashboard"    },
  { to: "/client/create-project", icon: PlusCircle,      label: "New Project"     },
  { to: "/client/projects",       icon: Inbox,           label: "My Projects"     },
  { to: "/client/bidding",        icon: Gavel,           label: "Project Bids"    },
  { to: "/client/payments",       icon: History,         label: "Payment History" },
  { to: "/client/profile",        icon: UserCircle,      label: "My Profile"      },
];

export function ClientLayout() {
  const { user, logout } = useApp();
  const navigate = useNavigate();

  const orgLabel = user?.orgRole === "team_leader" ? "Team Leader"
    : user?.orgRole === "project_manager" ? "Project Manager"
    : "Client";

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="w-60 flex flex-col bg-[#0c1a2e] text-white flex-shrink-0">

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <span className="text-white font-semibold tracking-wide text-sm block">FreelanceFlow</span>
            <span className="text-emerald-400 text-xs">Client Portal</span>
          </div>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-semibold">
            {user?.avatar}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
            <p className="text-white/40 text-xs">{orgLabel}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-400 font-medium"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`
              }>
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? "text-emerald-400" : ""} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <button onClick={() => { logout(); navigate("/"); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm">
            <LogOut size={18} /><span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <h2 className="text-gray-800 text-sm font-semibold">Client Portal</h2>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Bell size={18} className="text-gray-600" />
            </button>
            <NavLink to="/client/profile"
              className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-semibold hover:bg-emerald-600 transition-colors">
              {user?.avatar}
            </NavLink>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto"><Outlet /></main>
      </div>
    </div>
  );
}
