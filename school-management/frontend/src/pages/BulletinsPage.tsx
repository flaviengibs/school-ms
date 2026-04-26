import { useEffect, useState } from "react";
import { FileText, Zap, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../lib/api";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";

interface SubjectRow {
  subjectId: number; subjectName: string; coefficient: number;
  studentAvg: number; classAvg: number | null; gradeCount: number;
}

interface Bulletin {
  id: number; period: string; average: number; classAverage?: number;
  rank?: number; classSize?: number; comment?: string; createdAt: string;
  subjectData?: string;
  student: { id: number; user: { firstName: string; lastName: string } };
  class: { name: string };
}

interface Student { id: number; studentCode: string; user: { firstName: string; lastName: string } }
interface Settings {
  name: string; address?: string; phone?: string; email?: string;
  website?: string; logoUrl?: string; principalName?: string;
}

const avgColor = (avg: number) => {
  if (avg >= 16) return "#15803d";
  if (avg >= 12) return "#1d4ed8";
  if (avg >= 8) return "#a16207";
  return "#b91c1c";
};

const avgBg = (avg: number) => {
  if (avg >= 16) return "#dcfce7";
  if (avg >= 12) return "#dbeafe";
  if (avg >= 8) return "#fef9c3";
  return "#fee2e2";
};

export default function BulletinsPage() {
  const { user } = useAuth();
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<Settings>({ name: "My school" });
  const [filterPeriod, setFilterPeriod] = useState("");
  const [selected, setSelected] = useState<Bulletin | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genForm, setGenForm] = useState({ studentId: "", period: "Trimestre 1" });
  const [generating, setGenerating] = useState(false);
  const canGenerate = ["TEACHER", "ADMIN", "SUPER_ADMIN"].includes(user?.role || "");
  const periods = ["Trimestre 1", "Trimestre 2", "Trimestre 3"];

  const load = () => {
    const params: Record<string, string> = {};
    if (filterPeriod) params.period = filterPeriod;
    api.get("/bulletins", { params }).then(r => setBulletins(r.data)).catch(() => {});
  };

  useEffect(() => {
    load();
    api.get("/settings").then(r => setSettings(r.data)).catch(() => {});
    api.get("/users", { params: { role: "STUDENT" } }).then(async (r) => {
      const details = await Promise.all(r.data.map((u: any) => api.get(`/users/${u.id}`).then(res => res.data)));
      setStudents(details.filter((d: any) => d.student).map((d: any) => ({
        id: d.student.id, studentCode: d.student.studentCode,
        user: { firstName: d.firstName, lastName: d.lastName },
      })));
    }).catch(() => {});
  }, [filterPeriod]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const { data } = await api.post("/bulletins/generate", {
        studentId: parseInt(genForm.studentId), period: genForm.period,
      });
      toast.success("Bulletin generated");
      setShowGenerate(false);

      // Reload full list (no period filter to ensure we find the new bulletin)
      const refreshed = await api.get("/bulletins");
      setBulletins(refreshed.data);

      // Find the newly generated bulletin by id and select it
      const full = refreshed.data.find((b: Bulletin) => b.id === data.id);
      setSelected(full ?? null);

      // Also update the filtered list if a filter is active
      if (filterPeriod) {
        const filtered = await api.get("/bulletins", { params: { period: filterPeriod } });
        setBulletins(filtered.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error");
    } finally {
      setGenerating(false);
    }
  };

  const exportPdf = async (b: Bulletin) => {
    const doc = new jsPDF();
    const subjectRows: SubjectRow[] = b.subjectData ? JSON.parse(b.subjectData) : [];
    const pageW = doc.internal.pageSize.getWidth();

    // Fetch logo as base64 if available (avoids CORS issues with addImage)
    let logoDataUrl: string | null = null;
    if (settings.logoUrl) {
      try {
        const resp = await fetch(settings.logoUrl);
        const blob = await resp.blob();
        logoDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        logoDataUrl = null; // silently skip if fetch fails
      }
    }

    // Header background
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageW, logoDataUrl ? 44 : 38, "F");

    // Logo
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, "AUTO", 14, 6, 28, 28);
      } catch { /* skip */ }
    }

    const textX = logoDataUrl ? 48 : 14;

    // School name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(settings.name, textX, logoDataUrl ? 16 : 14);

    // School details
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const details = [settings.address, settings.phone, settings.email, settings.website].filter(Boolean).join("  ·  ");
    if (details) doc.text(details, textX, logoDataUrl ? 23 : 21);
    if (settings.principalName) doc.text(`Principal: ${settings.principalName}`, textX, logoDataUrl ? 29 : 27);

    const headerH = logoDataUrl ? 44 : 38;

    // Title
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Report card", 14, headerH + 12);

    // Student info block
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Student: ${b.student.user.firstName} ${b.student.user.lastName}`, 14, headerH + 22);
    doc.text(`Class: ${b.class.name}`, 14, headerH + 29);
    doc.text(`Period: ${b.period}`, 14, headerH + 36);
    doc.text(`Generated: ${new Date(b.createdAt).toLocaleDateString()}`, 14, headerH + 43);

    // Summary box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, headerH + 50, pageW - 28, 22, 3, 3, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(avgColor(b.average));
    doc.text(`Overall average: ${b.average.toFixed(2)}/20`, 20, headerH + 62);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (b.classAverage != null) doc.text(`Class average: ${b.classAverage.toFixed(2)}/20`, 100, headerH + 62);
    if (b.rank) doc.text(`Rank: ${b.rank}${b.classSize ? ` / ${b.classSize}` : ""}`, 155, headerH + 62);

    // Subject table
    autoTable(doc, {
      startY: headerH + 80,
      head: [["Subject", "Coeff.", "Your average", "Class average", "Appreciation"]],
      body: subjectRows.map(s => [
        s.subjectName,
        `×${s.coefficient}`,
        `${s.studentAvg.toFixed(2)}/20`,
        s.classAvg != null ? `${s.classAvg.toFixed(2)}/20` : "—",
        s.studentAvg >= 16 ? "Excellent" : s.studentAvg >= 14 ? "Good" : s.studentAvg >= 10 ? "Satisfactory" : s.studentAvg >= 8 ? "Needs improvement" : "Insufficient",
      ]),
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 60 },
        2: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "center" },
      },
    });

    // Comment
    if (b.comment) {
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Teacher's comment:", 14, finalY);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      doc.text(b.comment, 14, finalY + 7, { maxWidth: pageW - 28 });
    }

    // Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(`${settings.name} — ${b.period} — Confidential document`, 14, doc.internal.pageSize.getHeight() - 10);

    doc.save(`bulletin_${b.student.user.lastName}_${b.period.replace(" ", "_")}.pdf`);
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Bulletins</div><div className="page-subtitle">Student report cards</div></div>
        {canGenerate && (
          <button className="btn btn-primary" onClick={() => setShowGenerate(true)}>
            <Zap size={14} /> Generate bulletin
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 480px" : "1fr", gap: 16 }}>
        {/* List */}
        <div>
          <div className="card mb-4">
            <div className="card-header">
              <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} style={{ width: "auto" }}>
                <option value="">All periods</option>
                {periods.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <span className="text-muted text-sm">{bulletins.length} bulletins</span>
            </div>
          </div>

          <div className="grid-3">
            {bulletins.filter(b => b.student?.user && b.class).map(b => (
              <div
                key={b.id}
                className="card"
                style={{ cursor: "pointer", borderLeft: `3px solid ${avgColor(b.average)}`, transition: "box-shadow .15s" }}
                onClick={() => setSelected(b)}
              >
                <div className="card-body">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <div className="font-semibold">{b.student.user.firstName} {b.student.user.lastName}</div>
                      <div className="text-muted text-sm">{b.class.name} · {b.period}</div>
                    </div>
                    <FileText size={18} color="var(--text-muted)" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div style={{ textAlign: "center", padding: "8px 12px", borderRadius: 8, background: avgBg(b.average) }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: avgColor(b.average) }}>{b.average.toFixed(2)}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>/ 20</div>
                    </div>
                    {b.rank && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>#{b.rank}</div>
                        <div className="text-muted text-sm">{b.classSize ? `/ ${b.classSize}` : "rank"}</div>
                      </div>
                    )}
                    {b.classAverage != null && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)" }}>{b.classAverage.toFixed(2)}</div>
                        <div className="text-muted text-sm">class avg</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!bulletins.length && <div className="empty-state" style={{ gridColumn: "1/-1" }}><p>No bulletins yet</p></div>}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="card" style={{ alignSelf: "start", position: "sticky", top: 80 }}>
            <div className="card-header">
              <span className="card-title">{selected.student.user.firstName} {selected.student.user.lastName}</span>
              <div className="flex gap-2">
                <button className="btn btn-sm btn-primary" onClick={() => exportPdf(selected)}>
                  <Download size={12} /> PDF
                </button>
                <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
              </div>
            </div>
            <div className="card-body">
              <div className="text-muted text-sm mb-4">{selected.class.name} · {selected.period}</div>

              {/* Summary */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
                <div style={{ textAlign: "center", padding: 12, borderRadius: 8, background: avgBg(selected.average) }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: avgColor(selected.average) }}>{selected.average.toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Your average</div>
                </div>
                {selected.classAverage != null && (
                  <div style={{ textAlign: "center", padding: 12, borderRadius: 8, background: "var(--bg)" }}>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{selected.classAverage.toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Class average</div>
                  </div>
                )}
                {selected.rank && (
                  <div style={{ textAlign: "center", padding: 12, borderRadius: 8, background: "var(--bg)" }}>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>#{selected.rank}{selected.classSize ? `/${selected.classSize}` : ""}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Rank</div>
                  </div>
                )}
              </div>

              {/* Per-subject table */}
              {selected.subjectData && (() => {
                const rows: SubjectRow[] = JSON.parse(selected.subjectData);
                return (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th style={{ textAlign: "center" }}>Coeff.</th>
                          <th style={{ textAlign: "center" }}>Your avg</th>
                          <th style={{ textAlign: "center" }}>Class avg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(s => (
                          <tr key={s.subjectId}>
                            <td className="font-semibold">{s.subjectName}</td>
                            <td style={{ textAlign: "center" }} className="text-muted">×{s.coefficient}</td>
                            <td style={{ textAlign: "center" }}>
                              <span style={{
                                fontWeight: 700, color: avgColor(s.studentAvg),
                                background: avgBg(s.studentAvg), padding: "2px 8px", borderRadius: 6, fontSize: 12,
                              }}>
                                {s.studentAvg.toFixed(2)}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }} className="text-muted">
                              {s.classAvg != null ? s.classAvg.toFixed(2) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {selected.comment && (
                <div style={{ marginTop: 16, padding: 12, background: "var(--bg)", borderRadius: 8, fontSize: 13, fontStyle: "italic", color: "var(--text-muted)" }}>
                  "{selected.comment}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Generate modal */}
      {showGenerate && (
        <div className="modal-overlay" onClick={() => setShowGenerate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Generate bulletin</span>
              <button className="modal-close" onClick={() => setShowGenerate(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="text-muted text-sm mb-4">
                Computes the weighted average from all grades for the selected period, calculates class averages and rank.
              </p>
              <form onSubmit={handleGenerate}>
                <div className="form-group">
                  <label className="form-label">Student</label>
                  <select value={genForm.studentId} onChange={e => setGenForm(f => ({ ...f, studentId: e.target.value }))} required>
                    <option value="">Select student</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.user.firstName} {s.user.lastName}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Period</label>
                  <select value={genForm.period} onChange={e => setGenForm(f => ({ ...f, period: e.target.value }))}>
                    {periods.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowGenerate(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={generating}>
                    {generating ? <div className="spinner" /> : "Generate"}
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
