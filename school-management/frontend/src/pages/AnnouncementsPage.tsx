import { useEffect, useState } from "react";
import { Plus, Trash2, Megaphone } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";

interface Announcement { id: number; title: string; content: string; targetRole?: string; createdAt: string; authorId: number }

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: "Super admin", ADMIN: "Admin", TEACHER: "Teachers",
  STUDENT: "Students", PARENT: "Parents",
};

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", targetRole: "" });
  const canCreate = ["TEACHER", "ADMIN", "SUPER_ADMIN"].includes(user?.role || "");
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user?.role || "");

  const load = () => api.get("/announcements").then(r => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/announcements", { ...form, targetRole: form.targetRole || null });
      toast.success("Announcement posted");
      setShowModal(false); setForm({ title: "", content: "", targetRole: "" }); load();
    } catch (err: any) { toast.error(err.response?.data?.message || "Error"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this announcement?")) return;
    try { await api.delete(`/announcements/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Error"); }
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Announcements</div><div className="page-subtitle">School-wide communications</div></div>
        {canCreate && <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> New announcement</button>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map(a => (
          <div className="card" key={a.id}>
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Megaphone size={16} color="var(--primary)" />
                  <span className="font-semibold" style={{ fontSize: 15 }}>{a.title}</span>
                  {a.targetRole ? (
                    <span className="badge badge-blue">For {roleLabel[a.targetRole]}</span>
                  ) : (
                    <span className="badge badge-gray">Everyone</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted text-sm">{new Date(a.createdAt).toLocaleDateString()}</span>
                  {isAdmin && <button className="btn-icon" style={{ color: "var(--danger)" }} onClick={() => handleDelete(a.id)}><Trash2 size={13} /></button>}
                </div>
              </div>
              <p style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{a.content}</p>
            </div>
          </div>
        ))}
        {!items.length && (
          <div className="empty-state">
            <Megaphone size={40} />
            <p>No announcements yet</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">New announcement</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group"><label className="form-label">Title</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
                <div className="form-group"><label className="form-label">Content</label><textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} required /></div>
                <div className="form-group">
                  <label className="form-label">Target audience</label>
                  <select value={form.targetRole} onChange={e => setForm(f => ({ ...f, targetRole: e.target.value }))}>
                    <option value="">Everyone</option>
                    {Object.entries(roleLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Post</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
