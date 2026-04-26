import { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, Users } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";

interface Class { id: number; name: string; level: string; year: string; _count: { students: number } }

export default function ClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Class | null>(null);
  const [form, setForm] = useState({ name: "", level: "", year: "" });
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user?.role || "");

  const load = () => api.get("/classes").then(r => setClasses(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: "", level: "", year: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1) }); setShowModal(true); };
  const openEdit = (c: Class) => { setEditing(c); setForm({ name: c.name, level: c.level, year: c.year }); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) { await api.put(`/classes/${editing.id}`, form); toast.success("Class updated"); }
      else { await api.post("/classes", form); toast.success("Class created"); }
      setShowModal(false); load();
    } catch (err: any) { toast.error(err.response?.data?.message || "Error"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this class?")) return;
    try { await api.delete(`/classes/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Cannot delete class with students"); }
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Classes</div><div className="page-subtitle">Manage school classes</div></div>
        {isAdmin && <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New class</button>}
      </div>

      <div className="grid-3">
        {classes.map(c => (
          <div className="card" key={c.id}>
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="font-semibold" style={{ fontSize: 16 }}>{c.name}</div>
                  <div className="text-muted text-sm">{c.level} · {c.year}</div>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button className="btn-icon" onClick={() => openEdit(c)}><Edit2 size={13} /></button>
                    <button className="btn-icon" style={{ color: "var(--danger)" }} onClick={() => handleDelete(c.id)}><Trash2 size={13} /></button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2" style={{ color: "var(--text-muted)", fontSize: 13 }}>
                <Users size={14} /> {c._count.students} students
              </div>
            </div>
          </div>
        ))}
        {!classes.length && <div className="empty-state" style={{ gridColumn: "1/-1" }}><p>No classes yet</p></div>}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editing ? "Edit class" : "New class"}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group"><label className="form-label">Class name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 6ème A" required /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Level</label><input value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} placeholder="e.g. 6ème" required /></div>
                  <div className="form-group"><label className="form-label">School year</label><input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2025-2026" required /></div>
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
