import React from "react";
import { RouterProvider } from "react-router";
// Both files are now in the same folder as App.tsx
import { router } from "./routes"; 
import { AppProvider } from "./AppContext";

/**
 * Main Application Entry Point
 * AppProvider: Manages global authentication state from Java Backend
 * RouterProvider: Handles navigation between Freelancer and Client portals
 */
export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}