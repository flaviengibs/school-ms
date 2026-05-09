import { useEffect, useState } from "react";
import { Search, UserPlus, Plus, Users, Download } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Student {
  id: number; studentCode: string; enrollDate: string;
  user: { id: number; firstName: string; lastName: string; email: string; phone?: string };
  class?: { id: number; name: string };
  parent?: { id: number; user: { firstName: string; lastName: string; email: string } };
}
interface Class { id: number; name: string }
interface ParentOption { id: number; user: { firstName: string; lastName: string; email: string } }

const emptyForm = {
  firstName: "", lastName: "", email: "", phone: "", password: "", classId: "",
  parentMode: "new" as "new" | "existing" | "none",
  parentFirstName: "", parentLastName: "", parentEmail: "", parentPhone: "", parentPassword: "",
  existingParentId: "",
};

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showAssign, setShowAssign] = useState<Student | null>(null);
  const [classId, setClassId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ parentTempPassword?: string } | null>(null);
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user?.role || "");

  const load = () => {
    api.get("/users", { params: { role: "STUDENT", search: search || undefined } })
      .then(async (r) => {
        const details = await Promise.all(r.data.map((u: any) => api.get(`/users/${u.id}`).then(res => res.data)));
        setStudents(details.filter((d: any) => d.student).map((d: any) => ({
          ...d.student,
          user: { id: d.id, firstName: d.firstName, lastName: d.lastName, email: d.email, phone: d.phone },
          parent: d.student.parent ? { id: d.student.parent.id, user: d.student.parent.user } : undefined,
        })));
      }).catch(() => {});
    api.get("/classes").then(r => setClasses(r.data)).catch(() => {});
    api.get("/users", { params: { role: "PARENT" } }).then(async (r) => {
      const details = await Promise.all(r.data.map((u: any) => api.get(`/users/${u.id}`).then(res => res.data)));
      setParents(details.filter((d: any) => d.parent).map((d: any) => ({
        id: d.parent.id,
        user: { firstName: d.firstName, lastName: d.lastName, email: d.email },
      })));
    }).catch(() => {});
  };

  useEffect(() => { load(); }, [search]);

  // Auto-fill parent last name from student
  useEffect(() => {
    if (form.parentMode === "new" && form.lastName && !form.parentLastName) {
      setForm(f => ({ ...f, parentLastName: f.lastName }));
    }
  }, [form.lastName, form.parentMode]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Record<string, any> = {
        firstName: form.firstName, lastName: form.lastName,
        email: form.email, phone: form.phone, password: form.password,
        classId: form.classId || undefined,
      };
      if (form.parentMode === "new" && form.parentEmail) {
        payload.parentFirstName = form.parentFirstName;
        payload.parentLastName = form.parentLastName;
        payload.parentEmail = form.parentEmail;
        payload.parentPhone = form.parentPhone;
        if (form.parentPassword) payload.parentPassword = form.parentPassword;
      } else if (form.parentMode === "existing" && form.existingParentId) {
        payload.existingParentId = form.existingParentId;
      }
      const { data } = await api.post("/users/student", payload);
      setResult(data);
      if (data.parentTempPassword) {
        toast.success(`Parent account created — temp password: ${data.parentTempPassword}`, { duration: 12000 });
      } else {
        toast.success("Student created");
      }
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error creating student");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAssign) return;
    try {
      await api.post(`/classes/${classId}/assign-student`, { studentId: showAssign.id });
      toast.success("Student assigned to class");
      setShowAssign(null);
      load();
    } catch { toast.error("Error"); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Students</div>
          <div className="page-subtitle">{students.length} enrolled students</div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setResult(null); setShowModal(true); }}>
            <Plus size={14} /> Add student
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-bar"><Search size={14} /><input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Code</th><th>Name</th><th>Email</th><th>Class</th><th>Parent</th><th>Enrolled</th>{isAdmin && <th></th>}</tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td><span className="badge badge-gray">{s.studentCode}</span></td>
                  <td className="font-semibold">{s.user.firstName} {s.user.lastName}</td>
                  <td className="text-muted">{s.user.email}</td>
                  <td>{s.class ? <span className="badge badge-blue">{s.class.name}</span> : <span className="text-muted">—</span>}</td>
                  <td style={{ fontSize: 12 }}>
                    {s.parent
                      ? <span>{s.parent.user.firstName} {s.parent.user.lastName}</span>
                      : <span className="text-muted">—</span>}
                  </td>
                  <td className="text-muted">{new Date(s.enrollDate).toLocaleDateString()}</td>
                  {isAdmin && (
                    <td>
                      <button className="btn btn-sm btn-secondary" onClick={() => { setShowAssign(s); setClassId(String(s.class?.id || "")); }}>
                        <UserPlus size={12} /> Assign class
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!students.length && <div className="empty-state"><p>No students found</p></div>}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add student</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {result ? (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <div className="font-semibold" style={{ fontSize: 16, marginBottom: 8 }}>Student created</div>
                  {result.parentTempPassword && (
                    <div style={{ background: "var(--bg)", borderRadius: 8, padding: 14, fontSize: 13, marginBottom: 16, textAlign: "left" }}>
                      <div className="font-semibold" style={{ marginBottom: 4 }}>Parent account created</div>
                      <div className="text-muted">Temporary password: <strong style={{ color: "var(--primary)", fontFamily: "monospace" }}>{result.parentTempPassword}</strong></div>
                      <div className="text-muted" style={{ marginTop: 4, fontSize: 11 }}>Share this with the parent — they can change it after first login.</div>
                    </div>
                  )}
                  <div className="flex gap-2" style={{ justifyContent: "center" }}>
                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
                    <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setResult(null); }}>Add another</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreate}>
                  <div style={{ fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--primary)", marginBottom: 12 }}>
                    Student information
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">First name</label><input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required /></div>
                    <div className="form-group"><label className="form-label">Last name</label><input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
                    <div className="form-group"><label className="form-label">Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Password</label>
                      <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 chars, uppercase, number, special" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Class (optional)</label>
                      <select value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}>
                        <option value="">No class yet</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <hr className="divider" />

                  <div style={{ fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--primary)", marginBottom: 12 }}>
                    <Users size={12} style={{ display: "inline", marginRight: 6 }} />Parent / guardian
                  </div>
                  <div className="form-group">
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["new", "existing", "none"] as const).map(m => (
                        <button key={m} type="button"
                          className={`btn btn-sm ${form.parentMode === m ? "btn-primary" : "btn-secondary"}`}
                          onClick={() => setForm(f => ({ ...f, parentMode: m }))}>
                          {m === "new" ? "Create new" : m === "existing" ? "Link existing" : "None"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {form.parentMode === "new" && (
                    <>
                      <div className="form-row">
                        <div className="form-group"><label className="form-label">First name</label><input value={form.parentFirstName} onChange={e => setForm(f => ({ ...f, parentFirstName: e.target.value }))} required /></div>
                        <div className="form-group"><label className="form-label">Last name</label><input value={form.parentLastName} onChange={e => setForm(f => ({ ...f, parentLastName: e.target.value }))} required /></div>
                      </div>
                      <div className="form-row">
                        <div className="form-group"><label className="form-label">Email</label><input type="email" value={form.parentEmail} onChange={e => setForm(f => ({ ...f, parentEmail: e.target.value }))} required /></div>
                        <div className="form-group"><label className="form-label">Phone</label><input value={form.parentPhone} onChange={e => setForm(f => ({ ...f, parentPhone: e.target.value }))} /></div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Password <span className="text-muted">(leave blank to auto-generate)</span></label>
                        <input type="password" value={form.parentPassword} onChange={e => setForm(f => ({ ...f, parentPassword: e.target.value }))} placeholder="Auto-generated if empty" />
                      </div>
                    </>
                  )}

                  {form.parentMode === "existing" && (
                    <div className="form-group">
                      <label className="form-label">Select existing parent</label>
                      <select value={form.existingParentId} onChange={e => setForm(f => ({ ...f, existingParentId: e.target.value }))} required>
                        <option value="">Select a parent</option>
                        {parents.map(p => <option key={p.id} value={p.id}>{p.user.firstName} {p.user.lastName} ({p.user.email})</option>)}
                      </select>
                    </div>
                  )}

                  <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? <div className="spinner" /> : "Create student"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {showAssign && (
        <div className="modal-overlay" onClick={() => setShowAssign(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Assign class — {showAssign.user.firstName} {showAssign.user.lastName}</span>
              <button className="modal-close" onClick={() => setShowAssign(null)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAssign}>
                <div className="form-group">
                  <label className="form-label">Class</label>
                  <select value={classId} onChange={e => setClassId(e.target.value)} required>
                    <option value="">Select a class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAssign(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Assign</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
