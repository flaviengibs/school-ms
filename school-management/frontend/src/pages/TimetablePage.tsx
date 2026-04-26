import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";

interface Entry {
  id: number; day: string; startTime: string; endTime: string; room?: string;
  subject: { name: string };
  class: { id: number; name: string };
  teacher: { user: { firstName: string; lastName: string } };
}
interface Class { id: number; name: string }
interface Subject { id: number; name: string }
interface Teacher { id: number; user: { firstName: string; lastName: string } }

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const DAY_LABELS: Record<string, string> = {
  MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday",
};

export default function TimetablePage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filterClass, setFilterClass] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ classId: "", subjectId: "", teacherId: "", day: "MONDAY", startTime: "08:00", endTime: "09:00", room: "" });
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user?.role || "");

  const load = () => {
    const params: Record<string, string> = {};
    if (filterClass) params.classId = filterClass;
    api.get("/timetable", { params }).then(r => setEntries(r.data)).catch(() => {});
  };

  useEffect(() => {
    load();
    api.get("/classes").then(r => setClasses(r.data)).catch(() => {});
    api.get("/subjects").then(r => setSubjects(r.data)).catch(() => {});
    api.get("/users", { params: { role: "TEACHER" } }).then(async (r) => {
      const details = await Promise.all(r.data.map((u: any) => api.get(`/users/${u.id}`).then(res => res.data)));
      setTeachers(details.filter((d: any) => d.teacher).map((d: any) => ({
        id: d.teacher.id, user: { firstName: d.firstName, lastName: d.lastName },
      })));
    }).catch(() => {});
  }, [filterClass]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, classId: parseInt(form.classId), subjectId: parseInt(form.subjectId), teacherId: parseInt(form.teacherId) };
    try {
      await api.post("/timetable", payload);
      toast.success("Entry added");
      setShowModal(false); load();
    } catch (err: any) { toast.error(err.response?.data?.message || "Error"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this entry?")) return;
    try { await api.delete(`/timetable/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Error"); }
  };

  const byDay = DAYS.reduce((acc, d) => {
    acc[d] = entries.filter(e => e.day === d).sort((a, b) => a.startTime.localeCompare(b.startTime));
    return acc;
  }, {} as Record<string, Entry[]>);

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Timetable</div><div className="page-subtitle">Weekly schedule</div></div>
        {isAdmin && <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Add entry</button>}
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)} style={{ width: "auto" }}>
            <option value="">All classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {DAYS.map(day => (
          <div className="card" key={day}>
            <div className="card-header" style={{ background: "var(--primary)", borderRadius: "8px 8px 0 0" }}>
              <span className="card-title" style={{ color: "#fff" }}>{DAY_LABELS[day]}</span>
              <span className="text-sm" style={{ color: "rgba(255,255,255,.7)" }}>{byDay[day].length} slots</span>
            </div>
            <div className="card-body" style={{ padding: 12 }}>
              {byDay[day].length === 0 && <p className="text-muted text-sm">No classes</p>}
              {byDay[day].map(e => (
                <div key={e.id} className="timetable-entry" style={{ marginBottom: 8 }}>
                  <div className="flex justify-between items-center">
                    <strong>{e.subject.name}</strong>
                    {isAdmin && <button className="btn-icon btn-sm" style={{ color: "var(--danger)", border: "none", padding: 2 }} onClick={() => handleDelete(e.id)}><Trash2 size={12} /></button>}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {e.startTime} – {e.endTime} · {e.class.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {e.teacher.user.firstName} {e.teacher.user.lastName}{e.room ? ` · ${e.room}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add timetable entry</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Class</label>
                    <select value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))} required>
                      <option value="">Select class</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subject</label>
                    <select value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))} required>
                      <option value="">Select subject</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Teacher</label>
                    <select value={form.teacherId} onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))} required>
                      <option value="">Select teacher</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.user.firstName} {t.user.lastName}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Day</label>
                    <select value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value }))}>
                      {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Start</label><input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} required /></div>
                  <div className="form-group"><label className="form-label">End</label><input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} required /></div>
                </div>
                <div className="form-group"><label className="form-label">Room</label><input value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} placeholder="e.g. Room 101" /></div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Add</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
