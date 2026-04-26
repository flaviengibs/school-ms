import { useEffect, useState } from "react";
import { Plus, CheckCircle, XCircle, Clock, AlertCircle, Users } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";

interface Attendance {
  id: number; status: string; minutes?: number; reason?: string; justified: boolean; date: string;
  student: { id: number; user: { firstName: string; lastName: string } };
  teacher: { user: { firstName: string; lastName: string } };
}
interface Student { id: number; studentCode: string; user: { firstName: string; lastName: string } }
interface TimetableEntry {
  id: number; day: string; startTime: string; endTime: string; room?: string;
  subject: { name: string };
  class: { id: number; name: string };
}

const statusConfig: Record<string, { label: string; badge: string; icon: any }> = {
  PRESENT:  { label: "Present",  badge: "badge-green",  icon: CheckCircle },
  ABSENT:   { label: "Absent",   badge: "badge-red",    icon: XCircle },
  LATE:     { label: "Late",     badge: "badge-yellow", icon: Clock },
  EXCUSED:  { label: "Excused",  badge: "badge-blue",   icon: AlertCircle },
};

const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

export default function AttendancePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"take" | "history">("take");

  // Take attendance state
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [absences, setAbsences] = useState<Record<number, { status: string; minutes: string; reason: string }>>({});
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);

  // History state
  const [records, setRecords] = useState<Attendance[]>([]);
  const [filterStatus, setFilterStatus] = useState("");

  const canEdit = ["TEACHER", "ADMIN", "SUPER_ADMIN"].includes(user?.role || "");
  const isParent = user?.role === "PARENT";

  // Load timetable for today (or all for admins)
  useEffect(() => {
    if (!canEdit) return;
    const todayDay = DAYS[new Date().getDay()];
    api.get("/timetable", { params: user?.role === "TEACHER" ? {} : {} })
      .then(r => {
        // For teachers, filter to their own entries; admins see all
        setTimetableEntries(r.data);
      }).catch(() => {});
  }, [user]);

  // Load students when an entry is selected
  useEffect(() => {
    if (!selectedEntry) { setClassStudents([]); setAbsences({}); return; }
    api.get("/users", { params: { role: "STUDENT" } }).then(async (r) => {
      const details = await Promise.all(r.data.map((u: any) => api.get(`/users/${u.id}`).then(res => res.data)));
      const inClass = details
        .filter((d: any) => d.student?.classId === selectedEntry.class.id)
        .map((d: any) => ({
          id: d.student.id, studentCode: d.student.studentCode,
          user: { firstName: d.firstName, lastName: d.lastName },
        }));
      setClassStudents(inClass);
      setAbsences({});
    }).catch(() => {});
  }, [selectedEntry]);

  const loadHistory = () => {
    const params: Record<string, string> = {};
    if (filterStatus) params.status = filterStatus;
    api.get("/attendance", { params }).then(r => setRecords(r.data)).catch(() => {});
  };

  useEffect(() => { if (tab === "history") loadHistory(); }, [tab, filterStatus]);

  const toggleAbsence = (studentId: number) => {
    setAbsences(prev => {
      if (prev[studentId]) {
        const next = { ...prev };
        delete next[studentId];
        return next;
      }
      return { ...prev, [studentId]: { status: "ABSENT", minutes: "", reason: "" } };
    });
  };

  const updateAbsence = (studentId: number, field: string, value: string) => {
    setAbsences(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
  };

  const submitAttendance = async () => {
    if (!selectedEntry) return;
    setSubmitting(true);
    try {
      // Build records: absent/late/excused students + all others as PRESENT
      const records = classStudents.map(s => {
        const abs = absences[s.id];
        if (abs) {
          return { studentId: s.id, status: abs.status, minutes: abs.minutes ? parseInt(abs.minutes) : undefined, reason: abs.reason || undefined };
        }
        return { studentId: s.id, status: "PRESENT" };
      });

      await api.post("/attendance/bulk", {
        classId: selectedEntry.class.id,
        date: attendanceDate,
        records,
      });

      toast.success(`Attendance saved — ${classStudents.length - Object.keys(absences).length} present, ${Object.keys(absences).length} absent/late`);
      setSelectedEntry(null);
      setAbsences({});
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const justifyAsParent = async (id: number) => {
    const reason = prompt("Reason for justification (optional):");
    try { await api.put(`/attendance/${id}/justify`, { reason }); toast.success("Absence justified"); loadHistory(); }
    catch (err: any) { toast.error(err.response?.data?.message || "Error"); }
  };

  const justify = async (id: number, justified: boolean) => {
    try { await api.put(`/attendance/${id}`, { justified }); toast.success(justified ? "Justified" : "Unjustified"); loadHistory(); }
    catch { toast.error("Error"); }
  };

  // Group timetable by day
  const byDay = timetableEntries.reduce((acc, e) => {
    if (!acc[e.day]) acc[e.day] = [];
    acc[e.day].push(e);
    return acc;
  }, {} as Record<string, TimetableEntry[]>);

  const dayLabel: Record<string, string> = {
    MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday",
    THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday",
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Attendance</div><div className="page-subtitle">Absences and delays tracking</div></div>
      </div>

      {canEdit && (
        <div className="tabs">
          <button className={`tab${tab === "take" ? " active" : ""}`} onClick={() => setTab("take")}>
            <Users size={13} style={{ display: "inline", marginRight: 4 }} />Take attendance
          </button>
          <button className={`tab${tab === "history" ? " active" : ""}`} onClick={() => setTab("history")}>
            <Clock size={13} style={{ display: "inline", marginRight: 4 }} />History
          </button>
        </div>
      )}

      {/* Take attendance tab */}
      {(tab === "take" && canEdit) && (
        <div>
          {!selectedEntry ? (
            <div>
              <div className="card mb-4">
                <div className="card-header">
                  <span className="card-title">Select your hour</span>
                  <div className="form-group" style={{ margin: 0, width: "auto" }}>
                    <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} style={{ width: "auto" }} />
                  </div>
                </div>
              </div>

              {Object.keys(byDay).length === 0 && (
                <div className="empty-state"><p>No timetable entries found</p></div>
              )}

              {Object.entries(byDay).map(([day, entries]) => (
                <div key={day} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted)", marginBottom: 8 }}>
                    {dayLabel[day]}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {entries.map(e => (
                      <div
                        key={e.id}
                        className="card"
                        style={{ cursor: "pointer", borderLeft: "3px solid var(--primary)" }}
                        onClick={() => setSelectedEntry(e)}
                      >
                        <div className="card-body" style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div>
                            <div className="font-semibold">{e.subject.name}</div>
                            <div className="text-muted text-sm">{e.class.name} · {e.startTime}–{e.endTime}{e.room ? ` · ${e.room}` : ""}</div>
                          </div>
                          <button className="btn btn-sm btn-primary">Take attendance →</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div className="card mb-4">
                <div className="card-header">
                  <div>
                    <div className="font-semibold">{selectedEntry.subject.name} — {selectedEntry.class.name}</div>
                    <div className="text-muted text-sm">{selectedEntry.startTime}–{selectedEntry.endTime} · {attendanceDate}</div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectedEntry(null)}>← Back</button>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="text-muted text-sm">
                    Click a student to mark them absent/late. Everyone else is marked present automatically.
                  </span>
                  <span className="badge badge-red">{Object.keys(absences).length} absent/late</span>
                </div>
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  {classStudents.map(s => {
                    const abs = absences[s.id];
                    return (
                      <div key={s.id} style={{
                        border: `1px solid ${abs ? "var(--danger)" : "var(--border)"}`,
                        borderRadius: 8, overflow: "hidden",
                        background: abs ? "#fff5f5" : "var(--surface)",
                      }}>
                        <div
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", cursor: "pointer" }}
                          onClick={() => toggleAbsence(s.id)}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: "50%",
                              background: abs ? "var(--danger)" : "var(--success)",
                              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
                            }}>
                              {abs ? "✕" : "✓"}
                            </div>
                            <div>
                              <div className="font-semibold" style={{ fontSize: 13 }}>{s.user.firstName} {s.user.lastName}</div>
                              <div className="text-muted text-sm">{s.studentCode}</div>
                            </div>
                          </div>
                          <span className={`badge ${abs ? "badge-red" : "badge-green"}`}>
                            {abs ? (abs.status === "LATE" ? "Late" : abs.status === "EXCUSED" ? "Excused" : "Absent") : "Present"}
                          </span>
                        </div>

                        {abs && (
                          <div style={{ padding: "0 14px 12px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <select
                              value={abs.status}
                              onChange={e => updateAbsence(s.id, "status", e.target.value)}
                              style={{ width: "auto", fontSize: 12, padding: "4px 8px" }}
                              onClick={e => e.stopPropagation()}
                            >
                              <option value="ABSENT">Absent</option>
                              <option value="LATE">Late</option>
                              <option value="EXCUSED">Excused</option>
                            </select>
                            {abs.status === "LATE" && (
                              <input
                                type="number" min="1" placeholder="Minutes late"
                                value={abs.minutes}
                                onChange={e => updateAbsence(s.id, "minutes", e.target.value)}
                                onClick={e => e.stopPropagation()}
                                style={{ width: 120, fontSize: 12, padding: "4px 8px" }}
                              />
                            )}
                            <input
                              placeholder="Reason (optional)"
                              value={abs.reason}
                              onChange={e => updateAbsence(s.id, "reason", e.target.value)}
                              onClick={e => e.stopPropagation()}
                              style={{ flex: 1, minWidth: 140, fontSize: 12, padding: "4px 8px" }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!classStudents.length && <div className="empty-state"><p>No students in this class</p></div>}
                </div>
                {classStudents.length > 0 && (
                  <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => setSelectedEntry(null)}>Cancel</button>
                    <button className="btn btn-primary" onClick={submitAttendance} disabled={submitting}>
                      {submitting ? <div className="spinner" /> : `Save — ${classStudents.length - Object.keys(absences).length} present`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {(tab === "history" || !canEdit) && (
        <div>
          <div className="card">
            <div className="card-header">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: "auto" }}>
                <option value="">All statuses</option>
                {Object.entries(statusConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
              <span className="text-muted text-sm">{records.length} records</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Student</th><th>Status</th><th>Date</th><th>Delay</th><th>Reason</th><th>Justified</th><th>Teacher</th><th></th></tr>
                </thead>
                <tbody>
                  {records.map(r => {
                    const cfg = statusConfig[r.status];
                    return (
                      <tr key={r.id}>
                        <td className="font-semibold">{r.student.user.firstName} {r.student.user.lastName}</td>
                        <td><span className={`badge ${cfg.badge}`}>{cfg.label}</span></td>
                        <td className="text-muted">{new Date(r.date).toLocaleDateString()}</td>
                        <td className="text-muted">{r.minutes ? `${r.minutes} min` : "—"}</td>
                        <td className="text-muted">{r.reason || "—"}</td>
                        <td>
                          {(r.status === "ABSENT" || r.status === "LATE")
                            ? <span className={`badge ${r.justified ? "badge-green" : "badge-red"}`}>{r.justified ? "Yes" : "No"}</span>
                            : "—"}
                        </td>
                        <td className="text-muted">{r.teacher.user.firstName} {r.teacher.user.lastName}</td>
                        <td>
                          {canEdit && (r.status === "ABSENT" || r.status === "LATE") && (
                            <button className={`btn btn-sm ${r.justified ? "btn-secondary" : "btn-success"}`} onClick={() => justify(r.id, !r.justified)}>
                              {r.justified ? "Unjustify" : "Justify"}
                            </button>
                          )}
                          {isParent && (r.status === "ABSENT" || r.status === "LATE") && !r.justified && (
                            <button className="btn btn-sm btn-success" onClick={() => justifyAsParent(r.id)}>Justify</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!records.length && <div className="empty-state"><p>No attendance records</p></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
