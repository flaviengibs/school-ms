import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, GraduationCap, ClipboardList, Clock, FileText, AlertTriangle } from "lucide-react";
import api from "../lib/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface StudentDetail {
  id: number; studentCode: string; enrollDate: string;
  classId?: number;
  user: { firstName: string; lastName: string; email: string; phone?: string; status: string; blameCount: number };
  class?: { name: string; level: string };
  grades: { id: number; value: number; maxValue: number; period: string; date: string; comment?: string; subject: { name: string; coefficient: number } }[];
  bulletins: { id: number; period: string; average: number; classAverage?: number; rank?: number; classSize?: number }[];
}

const avgColor = (v: number) => v >= 16 ? "#15803d" : v >= 12 ? "#1d4ed8" : v >= 8 ? "#a16207" : "#b91c1c";
const avgBg   = (v: number) => v >= 16 ? "#dcfce7" : v >= 12 ? "#dbeafe" : v >= 8 ? "#fef9c3" : "#fee2e2";

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [sanctions, setSanctions] = useState<any[]>([]);
  const [tab, setTab] = useState<"overview" | "grades" | "attendance" | "sanctions" | "bulletins">("overview");

  useEffect(() => {
    if (!id) return;
    api.get(`/users/${id}`).then(r => {
      if (r.data.student) setStudent({ ...r.data.student, user: { firstName: r.data.firstName, lastName: r.data.lastName, email: r.data.email, phone: r.data.phone, status: r.data.status, blameCount: r.data.blameCount } });
    }).catch(() => {});
    api.get("/attendance", { params: { studentId: id } }).then(r => setAttendance(r.data)).catch(() => {});
    api.get("/blames", { params: { userId: id } }).then(r => setSanctions(r.data)).catch(() => {});
  }, [id]);

  if (!student) return <div className="loading-page"><div className="spinner" style={{ borderTopColor: "var(--primary)", borderColor: "var(--border)" }} /></div>;

  const absences = attendance.filter(a => a.status === "ABSENT").length;
  const lates    = attendance.filter(a => a.status === "LATE").length;
  const unjustified = attendance.filter(a => a.status === "ABSENT" && !a.justified).length;

  // Grade chart data — average per period
  const periodMap: Record<string, { sum: number; count: number }> = {};
  for (const g of student.grades) {
    if (!periodMap[g.period]) periodMap[g.period] = { sum: 0, count: 0 };
    periodMap[g.period].sum += (g.value / g.maxValue) * 20;
    periodMap[g.period].count += 1;
  }
  const chartData = Object.entries(periodMap).map(([period, { sum, count }]) => ({
    period, avg: Math.round((sum / count) * 100) / 100,
  }));

  // Per-subject averages
  const subjectMap: Record<string, { name: string; grades: number[]; coeff: number }> = {};
  for (const g of student.grades) {
    if (!subjectMap[g.subject.name]) subjectMap[g.subject.name] = { name: g.subject.name, grades: [], coeff: g.subject.coefficient };
    subjectMap[g.subject.name].grades.push((g.value / g.maxValue) * 20);
  }
  const subjectAverages = Object.values(subjectMap).map(s => ({
    name: s.name, coeff: s.coeff,
    avg: Math.round((s.grades.reduce((a, b) => a + b, 0) / s.grades.length) * 100) / 100,
    count: s.grades.length,
  })).sort((a, b) => b.avg - a.avg);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn-icon" onClick={() => navigate(-1)}><ArrowLeft size={16} /></button>
          <div>
            <div className="page-title">{student.user.firstName} {student.user.lastName}</div>
            <div className="page-subtitle">{student.studentCode}{student.class ? ` · ${student.class.name}` : ""}</div>
          </div>
        </div>
        <span className={`badge ${student.user.status === "ACTIVE" ? "badge-green" : "badge-red"}`}>{student.user.status}</span>
      </div>

      <div className="tabs">
        {(["overview", "grades", "attendance", "sanctions", "bulletins"] as const).map(t => (
          <button key={t} className={`tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><span className="card-title">Personal info</span></div>
            <div className="card-body">
              {[["Email", student.user.email], ["Phone", student.user.phone || "—"], ["Class", student.class?.name || "—"], ["Level", student.class?.level || "—"], ["Enrolled", new Date(student.enrollDate).toLocaleDateString()]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                  <span className="text-muted">{l}</span><span className="font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Quick stats</span></div>
            <div className="card-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "Absences", value: absences, color: "var(--danger)" },
                  { label: "Delays", value: lates, color: "var(--warning)" },
                  { label: "Unjustified", value: unjustified, color: "var(--danger)" },
                  { label: "Sanctions", value: sanctions.length, color: "#7f1d1d" },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: "center", padding: 12, background: "var(--bg)", borderRadius: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div className="text-muted text-sm">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="card" style={{ gridColumn: "1/-1" }}>
              <div className="card-header"><span className="card-title">Average evolution</span></div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 20]} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => [`${v}/20`, "Average"]} />
                    <Line type="monotone" dataKey="avg" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "grades" && (
        <div className="card">
          <div className="card-header"><span className="card-title">Grades by subject</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Subject</th><th>Coeff.</th><th>Average</th><th>Grades</th></tr></thead>
              <tbody>
                {subjectAverages.map(s => (
                  <tr key={s.name}>
                    <td className="font-semibold">{s.name}</td>
                    <td className="text-muted">×{s.coeff}</td>
                    <td>
                      <span style={{ background: avgBg(s.avg), color: avgColor(s.avg), fontWeight: 700, padding: "2px 10px", borderRadius: 6, fontSize: 13 }}>
                        {s.avg.toFixed(2)}/20
                      </span>
                    </td>
                    <td className="text-muted">{s.count} grade{s.count > 1 ? "s" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!subjectAverages.length && <div className="empty-state"><p>No grades yet</p></div>}
          </div>
        </div>
      )}

      {tab === "attendance" && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Status</th><th>Delay</th><th>Reason</th><th>Justified</th></tr></thead>
              <tbody>
                {attendance.map((a: any) => (
                  <tr key={a.id}>
                    <td className="text-muted">{new Date(a.date).toLocaleDateString()}</td>
                    <td><span className={`badge ${a.status === "ABSENT" ? "badge-red" : a.status === "LATE" ? "badge-yellow" : "badge-green"}`}>{a.status}</span></td>
                    <td className="text-muted">{a.minutes ? `${a.minutes} min` : "—"}</td>
                    <td className="text-muted">{a.reason || "—"}</td>
                    <td>{a.status === "ABSENT" ? <span className={`badge ${a.justified ? "badge-green" : "badge-red"}`}>{a.justified ? "Yes" : "No"}</span> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!attendance.length && <div className="empty-state"><p>No attendance records</p></div>}
          </div>
        </div>
      )}

      {tab === "sanctions" && (
        <div className="card">
          {!sanctions.length && <div className="empty-state" style={{ padding: 32 }}><AlertTriangle size={32} /><p>No sanctions</p></div>}
          {sanctions.map((s: any) => (
            <div key={s.id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertTriangle size={14} color="#b91c1c" />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>{s.type}</div>
                <div style={{ fontSize: 13 }}>{s.reason}</div>
                <div className="text-muted text-sm">{new Date(s.createdAt).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "bulletins" && (
        <div className="grid-3">
          {student.bulletins.map(b => (
            <div className="card" key={b.id}>
              <div className="card-body">
                <div className="text-muted text-sm mb-4">{b.period}</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ textAlign: "center", padding: "8px 12px", borderRadius: 8, background: avgBg(b.average) }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: avgColor(b.average) }}>{b.average.toFixed(2)}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>/ 20</div>
                  </div>
                  {b.rank && <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700 }}>#{b.rank}</div><div className="text-muted text-sm">{b.classSize ? `/ ${b.classSize}` : "rank"}</div></div>}
                  {b.classAverage != null && <div style={{ textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 600 }}>{b.classAverage.toFixed(2)}</div><div className="text-muted text-sm">class avg</div></div>}
                </div>
              </div>
            </div>
          ))}
          {!student.bulletins.length && <div className="empty-state" style={{ gridColumn: "1/-1" }}><FileText size={32} /><p>No bulletins yet</p></div>}
        </div>
      )}
    </div>
  );
}
