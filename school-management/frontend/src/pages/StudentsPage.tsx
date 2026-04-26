import { useEffect, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";

interface Student {
  id: number; studentCode: string; enrollDate: string;
  user: { id: number; firstName: string; lastName: string; email: string; phone?: string };
  class?: { id: number; name: string };
}
interface Class { id: number; name: string }

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [search, setSearch] = useState("");
  const [showAssign, setShowAssign] = useState<Student | null>(null);
  const [classId, setClassId] = useState("");
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user?.role || "");

  const load = () => {
    api.get("/users", { params: { role: "STUDENT", search: search || undefined } }).then(async (r) => {
      const details = await Promise.all(r.data.map((u: any) => api.get(`/users/${u.id}`).then(res => res.data)));
      setStudents(details.filter((d: any) => d.student).map((d: any) => ({ ...d.student, user: { id: d.id, firstName: d.firstName, lastName: d.lastName, email: d.email, phone: d.phone } })));
    }).catch(() => {});
    api.get("/classes").then(r => setClasses(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, [search]);

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
        <div><div className="page-title">Students</div><div className="page-subtitle">{students.length} enrolled students</div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-bar"><Search size={14} /><input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Code</th><th>Name</th><th>Email</th><th>Class</th><th>Enrolled</th>{isAdmin && <th></th>}</tr></thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td><span className="badge badge-gray">{s.studentCode}</span></td>
                  <td className="font-semibold">{s.user.firstName} {s.user.lastName}</td>
                  <td className="text-muted">{s.user.email}</td>
                  <td>{s.class ? <span className="badge badge-blue">{s.class.name}</span> : <span className="text-muted">—</span>}</td>
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
