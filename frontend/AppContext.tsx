import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "freelancer" | "client" | null;
export type OrgRole  = "team_leader" | "project_manager" | null;

interface AppUser {
  id:             string;
  name:           string;
  email:          string;
  role:           UserRole;
  orgRole:        OrgRole;
  teamLeaderName: string;
  avatar:         string;
}

interface AppContextType {
  user:            AppUser | null;
  login:           (role: UserRole, email?: string, name?: string, id?: string, orgRole?: OrgRole, teamLeaderName?: string) => void;
  updateUser:      (patch: Partial<AppUser>) => void;
  logout:          () => void;
  isAuthenticated: boolean;
}

const AppContext = createContext<AppContextType>({
  user: null, login: () => {}, updateUser: () => {}, logout: () => {}, isAuthenticated: false,
});

const SESSION_KEY = "freelanceflow_user";

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const s = localStorage.getItem(SESSION_KEY);
      if (!s) return null;
      const parsed = JSON.parse(s);
      // Ensure all fields exist even on old sessions
      return {
        id:             parsed.id             ?? "",
        name:           parsed.name           ?? "",
        email:          parsed.email          ?? "",
        role:           parsed.role           ?? null,
        orgRole:        parsed.orgRole        ?? null,
        teamLeaderName: parsed.teamLeaderName ?? "",
        avatar:         parsed.avatar         ?? "",
      };
    } catch { return null; }
  });

  // Sync to localStorage on every change
  useEffect(() => {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else       localStorage.removeItem(SESSION_KEY);
  }, [user]);

  const login = (
    role:            UserRole,
    email?:          string,
    name?:           string,
    id?:             string,
    orgRole?:        OrgRole,
    teamLeaderName?: string
  ) => {
    const resolvedName = name || (role === "freelancer" ? "Freelancer User" : "Client User");
    const newUser: AppUser = {
      id:             id             || (role === "freelancer" ? "f1" : "c6"),
      name:           resolvedName,
      email:          email          || "",
      role,
      orgRole:        role === "client" ? (orgRole ?? null) : null,
      teamLeaderName: teamLeaderName ?? "",
      avatar:         resolvedName.substring(0, 2).toUpperCase(),
    };
    setUser(newUser);
  };

  // Merges a partial update into the current user and persists immediately
  const updateUser = (patch: Partial<AppUser>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      // Persist synchronously to avoid any timing issue
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <AppContext.Provider value={{ user, login, updateUser, logout, isAuthenticated: !!user }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
