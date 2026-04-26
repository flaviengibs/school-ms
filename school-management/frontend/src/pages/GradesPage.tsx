import { useEffect, useState } from "react";
import { Plus, Trash2, Edit2 } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";

interface Grade {
  id: number; value: number; maxValue: number; period: string; comment?: string; date: string;
  subject: { name: string };
  student: { id: number; user: { firstName: string; lastName: string } };
  teacher: { user: { firstName: string; lastName: string } };
}
interface Subject { id: number; name: string }
interface Student { id: number; studentCode: string; user: { firstName: string; lastName: string } }

const gradeClass = (v: number, max: number) => {
  const p = v / max;
  if (p >= 0.8) return "grade-excellent";
  if (p >= 0.6) return "grade-good";
  if (p >= 0.4) return "grade-average";
  return "grade-poor";
};

export default function GradesPage() {
  const { user } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filterPeriod, setFilterPeriod] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [form, setForm] = useState({ studentId: "", subjectId: "", value: "", maxValue: "20", comment: "", period: "Trimestre 1" });

  const canEdit = ["TEACHER", "ADMIN", "SUPER_ADMIN"].includes(user?.role || "");

  const load = () => {
    const params: Record<string, string> = {};
    if (filterPeriod) params.period = filterPeriod;
    if (filterSubject) params.subjectId = filterSubject;
    api.get("/grades", { params }).then(r => setGrades(r.data)).catch(() => {});
  };

  useEffect(() => {
    load();
    api.get("/subjects").then(r => setSubjects(r.data)).catch(() => {});
    api.get("/users", { params: { role: "STUDENT" } }).then(async (r) => {
      const details = await Promise.all(r.data.map((u: any) => api.get(`/users/${u.id}`).then(res => res.data)));
      setStudents(details.filter((d: any) => d.student).map((d: any) => ({
        id: d.student.id, studentCode: d.student.studentCode,
        user: { firstName: d.firstName, lastName: d.lastName },
      })));
    }).catch(() => {});
  }, [filterPeriod, filterSubject]);

  const openCreate = () => { setEditing(null); setForm({ studentId: "", subjectId: "", value: "", maxValue: "20", comment: "", period: "Trimestre 1" }); setShowModal(true); };
  const openEdit = (g: Grade) => { setEditing(g); setForm({ studentId: String(g.student.id), subjectId: "", value: String(g.value), maxValue: String(g.maxValue), comment: g.comment || "", period: g.period }); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, studentId: parseInt(form.studentId), subjectId: parseInt(form.subjectId), value: parseFloat(form.value), maxValue: parseFloat(form.maxValue) };
    try {
      if (editing) { await api.put(`/grades/${editing.id}`, payload); toast.success("Grade updated"); }
      else { await api.post("/grades", payload); toast.success("Grade added"); }
      setShowModal(false); load();
    } catch (err: any) { toast.error(err.response?.data?.message || "Error"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this grade?")) return;
    try { await api.delete(`/grades/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Error"); }
  };

  const periods = ["Trimestre 1", "Trimestre 2", "Trimestre 3"];

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Grades</div><div className="page-subtitle">Student grades and evaluations</div></div>
        {canEdit && <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Add grade</button>}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex gap-2">
            <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} style={{ width: "auto" }}>
              <option value="">All periods</option>
              {periods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} style={{ width: "auto" }}>
              <option value="">All subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <span className="text-muted text-sm">{grades.length} grades</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Subject</th><th>Grade</th><th>Period</th><th>Teacher</th><th>Comment</th><th>Date</th>{canEdit && <th></th>}</tr></thead>
            <tbody>
              {grades.map(g => (
                <tr key={g.id}>
                  <td className="font-semibold">{g.student.user.firstName} {g.student.user.lastName}</td>
                  <td>{g.subject.name}</td>
                  <td>
                    <div className={`grade-chip ${gradeClass(g.value, g.maxValue)}`}>{g.value}</div>
                    <span className="text-muted text-sm">/{g.maxValue}</span>
                  </td>
                  <td><span className="badge badge-purple">{g.period}</span></td>
                  <td className="text-muted">{g.teacher.user.firstName} {g.teacher.user.lastName}</td>
                  <td className="text-muted">{g.comment || "—"}</td>
                  <td className="text-muted">{new Date(g.date).toLocaleDateString()}</td>
                  {canEdit && (
                    <td>
                      <div className="flex gap-2">
                        <button className="btn-icon" onClick={() => openEdit(g)}><Edit2 size={13} /></button>
                        <button className="btn-icon" style={{ color: "var(--danger)" }} onClick={() => handleDelete(g.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!grades.length && <div className="empty-state"><p>No grades found</p></div>}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editing ? "Edit grade" : "Add grade"}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Student</label>
                  <select value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} required>
                    <option value="">Select student</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.user.firstName} {s.user.lastName} ({s.studentCode})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <select value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))} required>
                    <option value="">Select subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Grade</label><input type="number" step="0.5" min="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} required /></div>
                  <div className="form-group"><label className="form-label">Out of</label><input type="number" value={form.maxValue} onChange={e => setForm(f => ({ ...f, maxValue: e.target.value }))} required /></div>
                </div>
                <div className="form-group">
                  <label className="form-label">Period</label>
                  <select value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}>
                    {periods.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Comment</label><textarea value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} rows={2} /></div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
