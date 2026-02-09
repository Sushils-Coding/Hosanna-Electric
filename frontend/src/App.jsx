import { Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider } from './components/Notification';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import GuestRoute from './components/GuestRoute';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import JobsPage from './pages/jobs/JobsPage';
import TeamPage from './pages/team/TeamPage';

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />

            {/* Protected layout with sidebar */}
            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/team" element={<TeamPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}
