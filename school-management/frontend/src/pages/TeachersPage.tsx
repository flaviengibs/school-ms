import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import api from "../lib/api";

interface Teacher {
  id: number; hireDate: string; bio?: string;
  user: { firstName: string; lastName: string; email: string; phone?: string };
  subjects: { id: number; name: string }[];
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/users", { params: { role: "TEACHER", search: search || undefined } }).then(async (r) => {
      const details = await Promise.all(r.data.map((u: any) => api.get(`/users/${u.id}`).then(res => res.data)));
      setTeachers(details.filter((d: any) => d.teacher).map((d: any) => ({
        ...d.teacher,
        user: { firstName: d.firstName, lastName: d.lastName, email: d.email, phone: d.phone },
      })));
    }).catch(() => {});
  }, [search]);

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Teachers</div><div className="page-subtitle">{teachers.length} teachers</div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-bar"><Search size={14} /><input placeholder="Search teachers..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Subjects</th><th>Hired</th></tr></thead>
            <tbody>
              {teachers.map(t => (
                <tr key={t.id}>
                  <td className="font-semibold">{t.user.firstName} {t.user.lastName}</td>
                  <td className="text-muted">{t.user.email}</td>
                  <td className="text-muted">{t.user.phone || "—"}</td>
                  <td>
                    <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                      {t.subjects?.map(s => <span key={s.id} className="badge badge-green">{s.name}</span>)}
                      {!t.subjects?.length && <span className="text-muted">—</span>}
                    </div>
                  </td>
                  <td className="text-muted">{new Date(t.hireDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!teachers.length && <div className="empty-state"><p>No teachers found</p></div>}
        </div>
      </div>
    </div>
  );
}
