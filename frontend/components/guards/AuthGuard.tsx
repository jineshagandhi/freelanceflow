import React from "react";
import { Navigate } from "react-router";
import { useApp } from "../AppContext";

interface AuthGuardProps {
  requiredRole: "freelancer" | "client";
  children: React.ReactNode;
}

export function AuthGuard({ requiredRole, children }: AuthGuardProps) {
  const { user, isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (user?.role !== requiredRole) {
    if (user?.role === "freelancer") return <Navigate to="/freelancer/dashboard" replace />;
    if (user?.role === "client") return <Navigate to="/client/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
