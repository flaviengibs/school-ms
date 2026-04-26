import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import api from "../lib/api";

interface Subject { id: number; name: string; coefficient: number }
interface Row {
  studentId: number; firstName: string; lastName: string;
  cells: Record<number, number | null>; overall: number | null;
}
interface GradebookData {
  class: { id: number; name: string };
  subjects: Subject[];
  rows: Row[];
  classAverages: Record<number, number | null>;
}
interface Class { id: number; name: string }

const cellColor = (v: number | null) => {
  if (v === null) return { bg: "transparent", color: "var(--text-muted)" };
  if (v >= 16) return { bg: "#dcfce7", color: "#15803d" };
  if (v >= 12) return { bg: "#dbeafe", color: "#1d4ed8" };
  if (v >= 8)  return { bg: "#fef9c3", color: "#a16207" };
  return { bg: "#fee2e2", color: "#b91c1c" };
};

export default function GradebookPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [classId, setClassId] = useState("");
  const [period, setPeriod] = useState("");
  const [data, setData] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(false);
  const periods = ["Trimestre 1", "Trimestre 2", "Trimestre 3"];

  useEffect(() => {
    api.get("/classes").then(r => setClasses(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!classId) { setData(null); return; }
    setLoading(true);
    const params: Record<string, string> = { classId };
    if (period) params.period = period;
    api.get("/gradebook", { params })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [classId, period]);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Gradebook</div>
          <div className="page-subtitle">Class grades overview</div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <div className="flex gap-2">
            <select value={classId} onChange={e => setClassId(e.target.value)} style={{ width: "auto" }}>
              <option value="">Select a class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={period} onChange={e => setPeriod(e.target.value)} style={{ width: "auto" }}>
              <option value="">All periods</option>
              {periods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {data && <span className="text-muted text-sm">{data.rows.length} students · {data.subjects.length} subjects</span>}
        </div>
      </div>

      {!classId && (
        <div className="empty-state"><BookOpen size={40} /><p>Select a class to view the gradebook</p></div>
      )}

      {loading && <div className="empty-state"><p>Loading...</p></div>}

      {data && !loading && (
        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 160, position: "sticky", left: 0, background: "var(--bg)", zIndex: 1 }}>Student</th>
                  {data.subjects.map(s => (
                    <th key={s.id} style={{ textAlign: "center", minWidth: 90, fontSize: 11 }}>
                      {s.name}<br />
                      <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>×{s.coefficient}</span>
                    </th>
                  ))}
                  <th style={{ textAlign: "center", minWidth: 80, background: "#1e293b", color: "#fff" }}>Overall</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map(row => (
                  <tr key={row.studentId}>
                    <td style={{ fontWeight: 600, position: "sticky", left: 0, background: "var(--surface)", zIndex: 1 }}>
                      {row.lastName} {row.firstName}
                    </td>
                    {data.subjects.map(s => {
                      const v = row.cells[s.id];
                      const { bg, color } = cellColor(v);
                      return (
                        <td key={s.id} style={{ textAlign: "center", padding: "8px 4px" }}>
                          {v !== null ? (
                            <span style={{ background: bg, color, fontWeight: 600, padding: "2px 8px", borderRadius: 6, fontSize: 12 }}>
                              {v.toFixed(2)}
                            </span>
                          ) : (
                            <span style={{ color: "var(--border)", fontSize: 12 }}>—</span>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ textAlign: "center" }}>
                      {row.overall !== null ? (
                        <span style={{ ...cellColor(row.overall), fontWeight: 700, padding: "3px 10px", borderRadius: 6, fontSize: 13, background: cellColor(row.overall).bg }}>
                          {row.overall.toFixed(2)}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}

                {/* Class averages row */}
                <tr style={{ background: "var(--bg)", borderTop: "2px solid var(--border)" }}>
                  <td style={{ fontWeight: 700, fontSize: 12, color: "var(--text-muted)", position: "sticky", left: 0, background: "var(--bg)" }}>
                    Class average
                  </td>
                  {data.subjects.map(s => {
                    const v = data.classAverages[s.id];
                    return (
                      <td key={s.id} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
                        {v !== null ? `${v.toFixed(2)}` : "—"}
                      </td>
                    );
                  })}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
