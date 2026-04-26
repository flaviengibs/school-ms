import { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, School, Users, BookOpen, LogIn } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface School {
  id: number; name: string; slug: string; createdAt: string;
  _count: { users: number; classes: number };
  settings?: { name: string; logoUrl?: string };
}

export default function SchoolsPage() {
  const { enterSchool } = useAuth();
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);
  const [form, setForm] = useState({
    name: "", slug: "",
    superAdminEmail: "", superAdminFirstName: "", superAdminLastName: "", superAdminPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const load = () => api.get("/schools").then(r => setSchools(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", slug: "", superAdminEmail: "", superAdminFirstName: "", superAdminLastName: "", superAdminPassword: "" });
    setShowModal(true);
  };

  const openEdit = (s: School) => {
    setEditing(s);
    setForm({ name: s.name, slug: s.slug, superAdminEmail: "", superAdminFirstName: "", superAdminLastName: "", superAdminPassword: "" });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await api.put(`/schools/${editing.id}`, { name: form.name, slug: form.slug });
        toast.success("School updated");
      } else {
        await api.post("/schools", form);
        toast.success("School created");
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error");
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this school and ALL its data? This cannot be undone.")) return;
    try { await api.delete(`/schools/${id}`); toast.success("School deleted"); load(); }
    catch { toast.error("Error"); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Schools</div>
          <div className="page-subtitle">Platform-wide school management</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> New school</button>
      </div>

      <div className="grid-3">
        {schools.map(s => (
          <div className="card" key={s.id}>
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {s.settings?.logoUrl ? (
                    <img src={s.settings.logoUrl} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} onError={e => (e.currentTarget.style.display = "none")} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <School size={18} color="#fff" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold">{s.settings?.name || s.name}</div>
                    <div className="text-muted text-sm">/{s.slug}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-sm btn-primary" onClick={async () => { await enterSchool(s.id, s.settings?.name || s.name); navigate("/"); }}>
                    <LogIn size={12} /> Enter
                  </button>
                  <button className="btn-icon" onClick={() => openEdit(s)}><Edit2 size={13} /></button>
                  <button className="btn-icon" style={{ color: "var(--danger)" }} onClick={() => handleDelete(s.id)}><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="flex gap-3" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                <span><Users size={12} style={{ display: "inline", marginRight: 3 }} />{s._count.users} users</span>
                <span><BookOpen size={12} style={{ display: "inline", marginRight: 3 }} />{s._count.classes} classes</span>
              </div>
              <div className="text-muted text-sm" style={{ marginTop: 8 }}>
                Created {new Date(s.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
        {!schools.length && <div className="empty-state" style={{ gridColumn: "1/-1" }}><School size={40} /><p>No schools yet</p></div>}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editing ? "Edit school" : "New school"}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">School name</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Slug (URL identifier)</label>
                    <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} placeholder="e.g. notre-dame" required />
                  </div>
                </div>

                {!editing && (
                  <>
                    <hr className="divider" />
                    <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--primary)", marginBottom: 12 }}>
                      Super admin account
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">First name</label>
                        <input value={form.superAdminFirstName} onChange={e => setForm(f => ({ ...f, superAdminFirstName: e.target.value }))} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Last name</label>
                        <input value={form.superAdminLastName} onChange={e => setForm(f => ({ ...f, superAdminLastName: e.target.value }))} required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input type="email" value={form.superAdminEmail} onChange={e => setForm(f => ({ ...f, superAdminEmail: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Password</label>
                      <input type="password" value={form.superAdminPassword} onChange={e => setForm(f => ({ ...f, superAdminPassword: e.target.value }))} placeholder="Min 8 chars, uppercase, number, special" required />
                    </div>
                  </>
                )}

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <div className="spinner" /> : editing ? "Save" : "Create school"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
