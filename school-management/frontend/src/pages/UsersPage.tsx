import { useEffect, useState } from "react";
import { Search, Trash2, Edit2, UserPlus, X } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";

interface User { id: number; email: string; firstName: string; lastName: string; role: string; phone?: string; createdAt: string; }
interface StudentOption { id: number; studentId: number; firstName: string; lastName: string; studentCode: string; class?: string }

const roleBadge: Record<string, string> = {
  OWNER: "badge-purple", SUPER_ADMIN: "badge-purple", ADMIN: "badge-blue",
  TEACHER: "badge-green", STUDENT: "badge-yellow", PARENT: "badge-gray",
};
const roleLabel: Record<string, string> = {
  OWNER: "Owner", SUPER_ADMIN: "Super admin", ADMIN: "Admin",
  TEACHER: "Teacher", STUDENT: "Student", PARENT: "Parent",
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", role: "STUDENT", phone: "" });
  const [linkedStudentIds, setLinkedStudentIds] = useState<number[]>([]);
  const [studentSearch, setStudentSearch] = useState("");

  const { activeSchoolId } = useAuth();
  const effectiveRole = (currentUser?.role === "OWNER" && activeSchoolId) ? "SUPER_ADMIN" : (currentUser?.role || "");

  // Roles this user can create
  const creatableRoles = currentUser?.role === "OWNER"
    ? Object.entries(roleLabel).filter(([v]) => v !== "OWNER") // owner can create all except owner
    : effectiveRole === "SUPER_ADMIN"
      ? Object.entries(roleLabel).filter(([v]) => !["OWNER", "SUPER_ADMIN"].includes(v))
      : Object.entries(roleLabel).filter(([v]) => !["OWNER", "SUPER_ADMIN", "ADMIN"].includes(v));

  const load = () => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (roleFilter) params.role = roleFilter;
    api.get("/users", { params }).then(r => setUsers(r.data)).catch(() => {});
  };

  const loadStudents = () => {
    api.get("/users", { params: { role: "STUDENT" } }).then(async r => {
      const details = await Promise.all(r.data.map((u: any) => api.get(`/users/${u.id}`).then(res => res.data)));
      setStudents(details.filter((d: any) => d.student).map((d: any) => ({
        id: d.id, studentId: d.student.id,
        firstName: d.firstName, lastName: d.lastName,
        studentCode: d.student.studentCode, class: d.student.class?.name,
      })));
    }).catch(() => {});
  };

  useEffect(() => { load(); }, [search, roleFilter]);
  useEffect(() => { if (showModal) loadStudents(); }, [showModal]);

  const openCreate = () => {
    setEditing(null);
    setForm({ firstName: "", lastName: "", email: "", password: "", role: "STUDENT", phone: "" });
    setLinkedStudentIds([]); setStudentSearch(""); setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, password: "", role: u.role, phone: u.phone || "" });
    setLinkedStudentIds([]); setStudentSearch(""); setShowModal(true);
  };

  const toggleStudent = (studentId: number) =>
    setLinkedStudentIds(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing && form.role === "PARENT" && linkedStudentIds.length === 0) {
      toast.error("Please link at least one student to this parent account"); return;
    }
    try {
      if (editing) {
        await api.put(`/users/${editing.id}`, form);
        toast.success("User updated");
      } else {
        const { data } = await api.post("/auth/register", { ...form, _adminCreated: true });
        let msg = "User created";
        if (data.tempPassword) {
          msg = `Account created — temp password: ${data.tempPassword}`;
          toast.success(msg, { duration: 12000 });
        } else {
          toast.success(msg);
        }
        if (form.role === "PARENT" && linkedStudentIds.length > 0) {
          const parentDetail = await api.get(`/users/${data.user.id}`);
          const parentProfileId = parentDetail.data.parent?.id;
          if (parentProfileId) {
            await Promise.all(linkedStudentIds.map(studentId =>
              api.put("/users/student-parent", { studentId, parentId: parentProfileId })
            ));
          }
        }
      }
      setShowModal(false); load();
    } catch (err: any) { toast.error(err.response?.data?.message || "Error"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    try { await api.delete(`/users/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Error deleting user"); }
  };

  const filteredStudents = students.filter(s =>
    !studentSearch || `${s.firstName} ${s.lastName} ${s.studentCode}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Users</div><div className="page-subtitle">Manage all accounts</div></div>
        <button className="btn btn-primary" onClick={openCreate}><UserPlus size={15} /> New user</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex gap-2 items-center">
            <div className="search-bar"><Search size={14} /><input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ width: "auto" }}>
              <option value="">All roles</option>
              {Object.entries(roleLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <span className="text-muted text-sm">{users.length} users</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Joined</th><th></th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="font-semibold">{u.firstName} {u.lastName}</td>
                  <td className="text-muted">{u.email}</td>
                  <td><span className={`badge ${roleBadge[u.role] || "badge-gray"}`}>{roleLabel[u.role] || u.role}</span></td>
                  <td className="text-muted">{u.phone || "—"}</td>
                  <td className="text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn-icon" onClick={() => openEdit(u)}><Edit2 size={13} /></button>
                      <button className="btn-icon" style={{ color: "var(--danger)" }} onClick={() => handleDelete(u.id)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length && <div className="empty-state"><p>No users found</p></div>}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editing ? "Edit user" : "New user"}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">First name</label><input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required /></div>
                  <div className="form-group"><label className="form-label">Last name</label><input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required /></div>
                </div>
                <div className="form-group"><label className="form-label">Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
                {/* Password is auto-generated for new accounts */}
                {editing && <div className="form-group"><label className="form-label">New password (leave blank to keep)</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select value={form.role} onChange={e => { setForm(f => ({ ...f, role: e.target.value })); setLinkedStudentIds([]); }}>
                      {creatableRoles.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                </div>

                {!editing && form.role === "PARENT" && (
                  <div className="form-group">
                    <label className="form-label">
                      Linked children <span style={{ color: "var(--danger)" }}>*</span>
                    </label>
                    {linkedStudentIds.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                        {linkedStudentIds.map(sid => {
                          const s = students.find(st => st.studentId === sid);
                          if (!s) return null;
                          return (
                            <span key={sid} style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--primary-light)", color: "var(--primary)", padding: "3px 8px", borderRadius: 999, fontSize: 12, fontWeight: 500 }}>
                              {s.firstName} {s.lastName}
                              <button type="button" onClick={() => toggleStudent(sid)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", padding: 0 }}><X size={11} /></button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <div className="search-bar" style={{ marginBottom: 6 }}>
                      <Search size={13} /><input placeholder="Search students..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                    </div>
                    <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
                      {filteredStudents.length === 0 && <div style={{ padding: 12, fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>No students found</div>}
                      {filteredStudents.map(s => {
                        const selected = linkedStudentIds.includes(s.studentId);
                        return (
                          <div key={s.studentId} onClick={() => toggleStudent(s.studentId)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)", background: selected ? "var(--primary-light)" : "transparent" }}>
                            <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${selected ? "var(--primary)" : "var(--border)"}`, background: selected ? "var(--primary)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {selected && <span style={{ color: "#fff", fontSize: 11 }}>✓</span>}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.firstName} {s.lastName}</div>
                              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.studentCode}{s.class ? ` · ${s.class}` : ""}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

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
