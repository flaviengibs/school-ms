import { useEffect, useState } from "react";
import { Users, GraduationCap, BookOpen, School, UserX, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

interface Stats {
  students: number;
  teachers: number;
  classes: number;
  subjects: number;
  absencesToday: number;
  latesToday: number;
  recentGrades: { id: number; value: number; maxValue: number; subject: { name: string }; student: { user: { firstName: string; lastName: string } } }[];
}

const gradeColor = (v: number, max: number) => {
  const pct = v / max;
  if (pct >= 0.8) return "var(--success)";
  if (pct >= 0.6) return "var(--secondary)";
  if (pct >= 0.4) return "var(--warning)";
  return "var(--danger)";
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (["ADMIN", "SUPER_ADMIN"].includes(user?.role || "")) {
      api.get("/dashboard").then(r => setStats(r.data)).catch(() => {});
    }
  }, [user]);

  const isAdmin = ["ADMIN", "SUPER_ADMIN", "OWNER"].includes(user?.role || "");

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Welcome back, {user?.firstName} 👋</div>
          <div className="page-subtitle">Here's what's happening today</div>
        </div>
      </div>

      {isAdmin && stats && (
        <>
          <div className="stats-grid">
            {[
              { label: "Students", value: stats.students, icon: GraduationCap, color: "#dbeafe", iconColor: "#1d4ed8" },
              { label: "Teachers", value: stats.teachers, icon: Users, color: "#dcfce7", iconColor: "#15803d" },
              { label: "Classes", value: stats.classes, icon: School, color: "#ede9fe", iconColor: "#6d28d9" },
              { label: "Subjects", value: stats.subjects, icon: BookOpen, color: "#fef9c3", iconColor: "#a16207" },
              { label: "Absences today", value: stats.absencesToday, icon: UserX, color: "#fee2e2", iconColor: "#b91c1c" },
              { label: "Delays today", value: stats.latesToday, icon: Clock, color: "#ffedd5", iconColor: "#c2410c" },
            ].map(s => (
              <div className="stat-card" key={s.label}>
                <div className="stat-icon" style={{ background: s.color }}>
                  <s.icon size={20} color={s.iconColor} />
                </div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-header"><span className="card-title">Recent grades</span></div>
              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Student</th><th>Subject</th><th>Grade</th></tr></thead>
                    <tbody>
                      {stats.recentGrades.map(g => (
                        <tr key={g.id}>
                          <td>{g.student.user.firstName} {g.student.user.lastName}</td>
                          <td>{g.subject.name}</td>
                          <td>
                            <span style={{ fontWeight: 700, color: gradeColor(g.value, g.maxValue) }}>
                              {g.value}/{g.maxValue}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Overview</span></div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { name: "Students", value: stats.students },
                    { name: "Teachers", value: stats.teachers },
                    { name: "Classes", value: stats.classes },
                    { name: "Subjects", value: stats.subjects },
                  ]}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      {!isAdmin && user?.role !== "OWNER" && (
        <div className="card">
          <div className="card-body">
            <p>Use the sidebar to navigate to your grades, timetable, attendance, and more.</p>
          </div>
        </div>
      )}

      {user?.role === "OWNER" && (
        <div className="card">
          <div className="card-header"><span className="card-title">Platform overview</span></div>
          <div className="card-body">
            <p className="text-muted text-sm">You are logged in as the platform owner. Use <strong>All schools</strong> in the sidebar to manage schools, or navigate into a school's data.</p>
          </div>
        </div>
      )}
    </div>
  );
}
