import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import ClassesPage from "./pages/ClassesPage";
import SubjectsPage from "./pages/SubjectsPage";
import StudentsPage from "./pages/StudentsPage";
import TeachersPage from "./pages/TeachersPage";
import GradesPage from "./pages/GradesPage";
import AttendancePage from "./pages/AttendancePage";
import TimetablePage from "./pages/TimetablePage";
import BulletinsPage from "./pages/BulletinsPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import ProfilePage from "./pages/ProfilePage";
import AuditPage from "./pages/AuditPage";
import MessagesPage from "./pages/MessagesPage";
import HomeworkPage from "./pages/HomeworkPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import SettingsPage from "./pages/SettingsPage";
import GradebookPage from "./pages/GradebookPage";
import BlamesPage from "./pages/BlamesPage";
import StudentProfilePage from "./pages/StudentProfilePage";
import SchoolsPage from "./pages/SchoolsPage";

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner" style={{ borderTopColor: "var(--primary)", borderColor: "var(--border)" }} /></div>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

// Admin or above (not students/teachers/parents)
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user || !["ADMIN", "SUPER_ADMIN", "OWNER"].includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// Super admin or above (not regular admins)
const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user || !["SUPER_ADMIN", "OWNER"].includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// Owner only
const OwnerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user || user.role !== "OWNER") return <Navigate to="/" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="teachers" element={<TeachersPage />} />
        <Route path="grades" element={<GradesPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="bulletins" element={<BulletinsPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="audit" element={<AdminRoute><AuditPage /></AdminRoute>} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="homework" element={<HomeworkPage />} />
        <Route path="applications" element={<AdminRoute><ApplicationsPage /></AdminRoute>} />
        <Route path="settings" element={<SuperAdminRoute><SettingsPage /></SuperAdminRoute>} />
        <Route path="gradebook" element={<GradebookPage />} />
        <Route path="blames" element={<BlamesPage />} />
        <Route path="students/:id" element={<StudentProfilePage />} />
        <Route path="schools" element={<OwnerRoute><SchoolsPage /></OwnerRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SocketProvider>
          <AppRoutes />
          <Toaster position="top-right" />
        </SocketProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
