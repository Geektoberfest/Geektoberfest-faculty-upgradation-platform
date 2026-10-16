/**
 * App.jsx — Root Component
 *
 * Sets up:
 * - AuthContext provider (wraps the entire app)
 * - React Router with all application routes
 * - ProtectedRoute guards for faculty and admin sections
 *
 * Route layout:
 *   /login, /register         → Public (no auth required)
 *   /dashboard, /courses, …   → Protected (any authenticated user with role=faculty)
 *   /admin/*                  → Protected (role=admin only)
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Faculty pages
import Dashboard from './pages/faculty/Dashboard';
import Profile from './pages/faculty/Profile';
import CourseBrowser from './pages/faculty/CourseBrowser';
import CourseDetail from './pages/faculty/CourseDetail';
import MyCourses from './pages/faculty/MyCourses';
import Credits from './pages/faculty/Credits';
import Achievements from './pages/faculty/Achievements';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import FacultyManagement from './pages/admin/FacultyManagement';
import CourseManagement from './pages/admin/CourseManagement';
import EnrollmentOverview from './pages/admin/EnrollmentOverview';
import CreditManagement from './pages/admin/CreditManagement';

// Catch-all
import NotFound from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
        <Routes>
          {/* ── Root redirect ─────────────────────────────── */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* ── Public routes ────────────────────────────── */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ── Faculty routes (role: faculty) ───────────── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="faculty">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute role="faculty">
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute role="faculty">
                <CourseBrowser />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:id"
            element={
              <ProtectedRoute role="faculty">
                <CourseDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-courses"
            element={
              <ProtectedRoute role="faculty">
                <MyCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/credits"
            element={
              <ProtectedRoute role="faculty">
                <Credits />
              </ProtectedRoute>
            }
          />
          <Route
            path="/achievements"
            element={
              <ProtectedRoute role="faculty">
                <Achievements />
              </ProtectedRoute>
            }
          />

          {/* ── Admin routes (role: admin) ───────────────── */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/faculty"
            element={
              <ProtectedRoute role="admin">
                <FacultyManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses"
            element={
              <ProtectedRoute role="admin">
                <CourseManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/enrollments"
            element={
              <ProtectedRoute role="admin">
                <EnrollmentOverview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/credits"
            element={
              <ProtectedRoute role="admin">
                <CreditManagement />
              </ProtectedRoute>
            }
          />

          {/* ── 404 catch-all ────────────────────────────── */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
