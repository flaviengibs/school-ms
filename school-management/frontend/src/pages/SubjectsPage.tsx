import { useEffect, useState } from "react";
import { Plus, Trash2, Edit2 } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";

interface Subject { id: number; name: string; code: string; coefficient: number; teacher?: { user: { firstName: string; lastName: string } } }
interface Teacher { id: number; user: { firstName: string; lastName: string } }

export default function SubjectsPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState({ name: "", code: "", coefficient: "1", teacherId: "" });
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user?.role || "");

  const load = () => {
    api.get("/subjects").then(r => setSubjects(r.data)).catch(() => {});
    api.get("/users", { params: { role: "TEACHER" } }).then(r => {
      // Get teacher profiles
      api.get("/users", { params: { role: "TEACHER" } }).then(() => {});
    }).catch(() => {});
  };

  useEffect(() => {
    api.get("/subjects").then(r => setSubjects(r.data)).catch(() => {});
    // Load teachers via users endpoint then get teacher profiles
    api.get("/users", { params: { role: "TEACHER" } }).then(async (r) => {
      const teacherProfiles = await Promise.all(
        r.data.map((u: any) => api.get(`/users/${u.id}`).then(res => res.data.teacher ? { id: res.data.teacher.id, user: { firstName: u.firstName, lastName: u.lastName } } : null))
      );
      setTeachers(teacherProfiles.filter(Boolean));
    }).catch(() => {});
  }, []);

  const openCreate = () => { setEditing(null); setForm({ name: "", code: "", coefficient: "1", teacherId: "" }); setShowModal(true); };
  const openEdit = (s: Subject) => { setEditing(s); setForm({ name: s.name, code: s.code, coefficient: String(s.coefficient), teacherId: "" }); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, coefficient: parseFloat(form.coefficient), teacherId: form.teacherId ? parseInt(form.teacherId) : undefined };
    try {
      if (editing) { await api.put(`/subjects/${editing.id}`, payload); toast.success("Subject updated"); }
      else { await api.post("/subjects", payload); toast.success("Subject created"); }
      setShowModal(false);
      api.get("/subjects").then(r => setSubjects(r.data)).catch(() => {});
    } catch (err: any) { toast.error(err.response?.data?.message || "Error"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this subject?")) return;
    try { await api.delete(`/subjects/${id}`); toast.success("Deleted"); api.get("/subjects").then(r => setSubjects(r.data)).catch(() => {}); }
    catch { toast.error("Error"); }
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Subjects</div><div className="page-subtitle">Manage school subjects</div></div>
        {isAdmin && <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New subject</button>}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Code</th><th>Coefficient</th><th>Teacher</th>{isAdmin && <th></th>}</tr></thead>
            <tbody>
              {subjects.map(s => (
                <tr key={s.id}>
                  <td className="font-semibold">{s.name}</td>
                  <td><span className="badge badge-blue">{s.code}</span></td>
                  <td>×{s.coefficient}</td>
                  <td className="text-muted">{s.teacher ? `${s.teacher.user.firstName} ${s.teacher.user.lastName}` : "—"}</td>
                  {isAdmin && (
                    <td>
                      <div className="flex gap-2">
                        <button className="btn-icon" onClick={() => openEdit(s)}><Edit2 size={13} /></button>
                        <button className="btn-icon" style={{ color: "var(--danger)" }} onClick={() => handleDelete(s.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!subjects.length && <div className="empty-state"><p>No subjects yet</p></div>}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editing ? "Edit subject" : "New subject"}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
                  <div className="form-group"><label className="form-label">Code</label><input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Coefficient</label><input type="number" step="0.5" min="0.5" value={form.coefficient} onChange={e => setForm(f => ({ ...f, coefficient: e.target.value }))} required /></div>
                  <div className="form-group">
                    <label className="form-label">Teacher</label>
                    <select value={form.teacherId} onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))}>
                      <option value="">None</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.user.firstName} {t.user.lastName}</option>)}
                    </select>
                  </div>
                </div>
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
