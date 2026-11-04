import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { ToastProvider } from "./components/ui/Toast";
import { useAuthStore } from "./stores/useAuthStore";

// Views
import { LoginView } from "./views/auth/LoginView";
import { RegisterView } from "./views/auth/RegisterView";
import { DashboardView } from "./views/dashboard/DashboardView";
import { TasksView } from "./views/tasks/TasksView";
import { EventsView } from "./views/events/EventsView";
import { AnnouncementsView } from "./views/announcements/AnnouncementsView";
import { ProjectsView } from "./views/projects/ProjectsView";
import { ResourcesView } from "./views/resources/ResourcesView";
import { MembersView } from "./views/members/MembersView";
import { ProfileView } from "./views/profile/ProfileView";
import { CRPanelView } from "./views/cr-panel/CRPanelView";
import { AdminDashboardView } from "./views/admin/AdminDashboardView";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Redirect legacy showcase preview to primary flight deck */}
            <Route
              path="/showcase"
              element={<Navigate to="/dashboard" replace />}
            />

            {/* Public Authentication Routes */}
            <Route
              path="/login"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <LoginView />
                )
              }
            />
            <Route
              path="/register"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <RegisterView />
                )
              }
            />

            {/* Protected Core Application Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute>
                  <TasksView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events"
              element={
                <ProtectedRoute>
                  <EventsView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/announcements"
              element={
                <ProtectedRoute>
                  <AnnouncementsView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <ProjectsView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resources"
              element={
                <ProtectedRoute>
                  <ResourcesView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/members"
              element={
                <ProtectedRoute>
                  <MembersView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfileView />
                </ProtectedRoute>
              }
            />

            {/* Gated Leadership Route */}
            <Route
              path="/cr-panel"
              element={
                <ProtectedRoute roles={["cr", "admin"]}>
                  <CRPanelView />
                </ProtectedRoute>
              }
            />

            {/* Root & Catch-all Fallbacks */}
            <Route
              path="/"
              element={
                <Navigate
                  to={isAuthenticated ? "/dashboard" : "/login"}
                  replace
                />
              }
            />
            <Route
              path="*"
              element={
                <Navigate
                  to={isAuthenticated ? "/dashboard" : "/login"}
                  replace
                />
              }
            />
            <Route
              path="/admin/batches"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminDashboardView />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
