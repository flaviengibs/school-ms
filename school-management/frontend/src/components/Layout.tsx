import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import NotificationBell from "./NotificationBell";
import ForcePasswordChange from "./ForcePasswordChange";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, BookOpen, GraduationCap, UserCheck,
  ClipboardList, Calendar, FileText, Megaphone, LogOut, User,
  School, Clock, Shield, MessageSquare, BookMarked, ClipboardCheck,
  BarChart2, Settings, AlertTriangle, Moon, Sun, Menu, X
} from "lucide-react";

const navItems = [
  { section: "General", items: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["OWNER", "SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT", "PARENT"] },
    { to: "/announcements", label: "Announcements", icon: Megaphone, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT", "PARENT"] },
    { to: "/messages", label: "Messages", icon: MessageSquare, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT", "PARENT"] },
  ]},
  { section: "Academic", items: [
    { to: "/classes", label: "Classes", icon: School, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"] },
    { to: "/subjects", label: "Subjects", icon: BookOpen, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"] },
    { to: "/timetable", label: "Timetable", icon: Calendar, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT", "PARENT"] },
    { to: "/homework", label: "Homework", icon: BookMarked, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT"] },
    { to: "/grades", label: "Grades", icon: ClipboardList, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT", "PARENT"] },
    { to: "/gradebook", label: "Gradebook", icon: BarChart2, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"] },
    { to: "/bulletins", label: "Bulletins", icon: FileText, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT", "PARENT"] },
    { to: "/attendance", label: "Attendance", icon: Clock, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT", "PARENT"] },
  ]},
  { section: "People", items: [
    { to: "/students", label: "Students", icon: GraduationCap, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"] },
    { to: "/teachers", label: "Teachers", icon: UserCheck, roles: ["SUPER_ADMIN", "ADMIN"] },
    { to: "/users", label: "All users", icon: Users, roles: ["SUPER_ADMIN", "ADMIN"] },
    { to: "/blames", label: "Blames", icon: AlertTriangle, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"] },
  ]},
  { section: "Security", items: [
    { to: "/audit", label: "Audit & security", icon: Shield, roles: ["SUPER_ADMIN", "ADMIN"] },
    { to: "/applications", label: "Applications", icon: ClipboardCheck, roles: ["SUPER_ADMIN", "ADMIN"] },
    { to: "/settings", label: "School settings", icon: Settings, roles: ["SUPER_ADMIN"] },
  ]},
  { section: "Platform", items: [
    { to: "/schools", label: "All schools", icon: School, roles: ["OWNER"] },
  ]},
];

export default function Layout() {
  const { user, logout, activeSchoolId, activeSchoolName, exitSchool } = useAuth();
  const { connected } = useSocket();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  // When owner is inside a school, treat them as SUPER_ADMIN for nav visibility
  const effectiveRole = (user?.role === "OWNER" && activeSchoolId) ? "SUPER_ADMIN" : (user?.role || "");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // Close sidebar on navigation
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const pageTitle = () => {
    const path = location.pathname;
    if (path === "/") return "Dashboard";
    return path.slice(1).charAt(0).toUpperCase() + path.slice(2);
  };

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : "?";
  const roleLabel: Record<string, string> = {
    OWNER: "Platform owner", SUPER_ADMIN: "Super admin", ADMIN: "Admin",
    TEACHER: "Teacher", STUDENT: "Student", PARENT: "Parent",
  };

  return (
    <div className="layout">
      {/* Force password change — blocks everything */}
      {user?.mustChangePassword && <ForcePasswordChange onDone={() => {}} />}

      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="sidebar-logo">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.svg" alt="SchoolMS" style={{ width: 36, height: 36, borderRadius: 8 }} />
            <div>
              <h1 style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "-.01em" }}>SchoolMS</h1>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,.45)", marginTop: 1 }}>Management system</p>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((section) => {
            const visible = section.items.filter(i =>
              i.roles.includes(effectiveRole) || i.roles.includes(user?.role || "")
            );
            if (!visible.length) return null;
            return (
              <div className="nav-section" key={section.section}>
                <div className="nav-section-title">{section.section}</div>
                {visible.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <NavLink to="/profile" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            <User size={16} /> Profile
          </NavLink>
          <div className="user-info">
            <div className="user-avatar">{initials}</div>
            <div>
              <div className="user-name">{user?.firstName} {user?.lastName}</div>
              <div className="user-role">{roleLabel[user?.role || ""]}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={() => logout()}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="hamburger btn-icon" style={{ border: "none" }} onClick={() => setSidebarOpen(o => !o)}>
              <Menu size={18} />
            </button>
            <span className="topbar-title">{pageTitle()}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Owner school context banner */}
            {user?.role === "OWNER" && activeSchoolId && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px", background: "var(--primary-light)", borderRadius: 20, fontSize: 12 }}>
                <span style={{ color: "var(--primary)", fontWeight: 600 }}>📍 {activeSchoolName}</span>
                <button onClick={() => { exitSchool(); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontSize: 11, padding: 0 }}>
                  ✕ Exit
                </button>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: connected ? "var(--success)" : "var(--text-muted)" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: connected ? "var(--success)" : "var(--border)", display: "inline-block" }} />
              {connected ? "Live" : "Offline"}
            </div>
            <button className="btn-icon" style={{ border: "none" }} onClick={() => setDark(d => !d)} title="Toggle dark mode">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <NotificationBell />
          </div>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
