import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";

interface Application {
  id: number; firstName: string; lastName: string; email: string; phone?: string;
  birthDate?: string; role: string; prevSchool?: string; prevYear?: string;
  prevAverage?: number; motivation?: string; status: string;
  reviewNote?: string; createdAt: string;
  parentFirstName?: string; parentLastName?: string; parentEmail?: string; parentPhone?: string;
  customAnswers?: string;
}

const statusConfig: Record<string, { label: string; badge: string; icon: any }> = {
  PENDING:  { label: "Pending",  badge: "badge-yellow", icon: Clock },
  ACCEPTED: { label: "Accepted", badge: "badge-green",  icon: CheckCircle },
  REJECTED: { label: "Rejected", badge: "badge-red",    icon: XCircle },
};

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [selected, setSelected] = useState<Application | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptResult, setAcceptResult] = useState<{ user: { email: string; tempPassword: string }; parent?: { email: string; tempPassword: string } } | null>(null);

  const load = () => {
    api.get("/applications", { params: { status: filter || undefined } })
      .then(r => setApps(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, [filter]);

  const review = async (status: "ACCEPTED" | "REJECTED") => {
    if (!selected) return;
    setLoading(true);
    try {
      const { data } = await api.put(`/applications/${selected.id}/review`, { status, reviewNote });
      if (status === "ACCEPTED" && data.user) {
        setAcceptResult(data);
        toast.success("Application accepted", { duration: 5000 });
      } else {
        toast.success(status === "ACCEPTED" ? "Application accepted" : "Application rejected");
        setSelected(null);
        setReviewNote("");
      }
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Applications</div>
          <div className="page-subtitle">Admission requests</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 420px" : "1fr", gap: 16 }}>
        <div>
          <div className="card mb-4">
            <div className="card-header">
              <div className="flex gap-2">
                {["", "PENDING", "ACCEPTED", "REJECTED"].map(s => (
                  <button
                    key={s}
                    className={`btn btn-sm ${filter === s ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setFilter(s)}
                  >
                    {s || "All"}
                  </button>
                ))}
              </div>
              <span className="text-muted text-sm">{apps.length} applications</span>
            </div>
          </div>

          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Role</th><th>Previous average</th><th>Status</th><th>Date</th><th></th></tr>
                </thead>
                <tbody>
                  {apps.map(a => {
                    const cfg = statusConfig[a.status];
                    return (
                      <tr key={a.id}>
                        <td className="font-semibold">{a.firstName} {a.lastName}</td>
                        <td className="text-muted">{a.email}</td>
                        <td><span className="badge badge-blue">{a.role}</span></td>
                        <td>{a.prevAverage != null ? `${a.prevAverage}/20` : "—"}</td>
                        <td><span className={`badge ${cfg.badge}`}>{cfg.label}</span></td>
                        <td className="text-muted">{new Date(a.createdAt).toLocaleDateString()}</td>
                        <td>
                          <button className="btn btn-sm btn-secondary" onClick={() => { setSelected(a); setReviewNote(""); }}>
                            <Eye size={12} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!apps.length && <div className="empty-state"><p>No applications</p></div>}
            </div>
          </div>
        </div>

        {selected && (
          <div className="card" style={{ alignSelf: "start", position: "sticky", top: 80 }}>
            <div className="card-header">
              <span className="card-title">{selected.firstName} {selected.lastName}</span>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="card-body">
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                {[
                  ["Email", selected.email],
                  ["Phone", selected.phone || "—"],
                  ["Date of birth", selected.birthDate || "—"],
                  ["Applying as", selected.role],
                  ["Previous school", selected.prevSchool || "—"],
                  ["School year", selected.prevYear || "—"],
                  ["Previous average", selected.prevAverage != null ? `${selected.prevAverage}/20` : "—"],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span className="text-muted">{label}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              </div>

              {selected.motivation && (
                <div style={{ marginTop: 16 }}>
                  <div className="form-label">Motivation letter</div>
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-muted)", marginTop: 6, fontStyle: "italic" }}>
                    "{selected.motivation}"
                  </p>
                </div>
              )}

              {/* Custom question answers */}
              {selected.customAnswers && (() => {
                let answers: Record<string, any> = {};
                try { answers = JSON.parse(selected.customAnswers); } catch {}
                const entries = Object.entries(answers).filter(([, v]) => v !== undefined && v !== "" && v !== null);
                if (!entries.length) return null;
                return (
                  <div style={{ marginTop: 16, padding: 12, background: "var(--bg)", borderRadius: 8 }}>
                    <div className="form-label" style={{ marginBottom: 8 }}>Custom question answers</div>
                    {entries.map(([key, value]) => (
                      <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                        <span className="text-muted" style={{ flex: 1 }}>{key.replace(/^custom_\d+_?/, "").replace(/_/g, " ")}</span>
                        <span className="font-semibold" style={{ flex: 2, textAlign: "right" }}>
                          {Array.isArray(value) ? value.filter(v => !v.startsWith("__other_text:")).join(", ") : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {selected.role === "STUDENT" && (selected.parentFirstName || selected.parentEmail) && (
                <div style={{ marginTop: 16, padding: 12, background: "var(--bg)", borderRadius: 8 }}>
                  <div className="form-label" style={{ marginBottom: 8 }}>Parent / guardian</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                    {selected.parentFirstName && (
                      <div className="flex justify-between">
                        <span className="text-muted">Name</span>
                        <span className="font-semibold">{selected.parentFirstName} {selected.parentLastName}</span>
                      </div>
                    )}
                    {selected.parentEmail && (
                      <div className="flex justify-between">
                        <span className="text-muted">Email</span>
                        <span className="font-semibold">{selected.parentEmail}</span>
                      </div>
                    )}
                    {selected.parentPhone && (
                      <div className="flex justify-between">
                        <span className="text-muted">Phone</span>
                        <span className="font-semibold">{selected.parentPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selected.status === "PENDING" && (
                <div style={{ marginTop: 20 }}>
                  <div className="form-group">
                    <label className="form-label">Review note (optional)</label>
                    <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={3} placeholder="Internal note or message to the applicant..." />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button className="btn btn-danger" style={{ flex: 1, justifyContent: "center" }} onClick={() => review("REJECTED")} disabled={loading}>
                      <XCircle size={14} /> Reject
                    </button>
                    <button className="btn btn-success" style={{ flex: 1, justifyContent: "center" }} onClick={() => review("ACCEPTED")} disabled={loading}>
                      <CheckCircle size={14} /> Accept
                    </button>
                  </div>
                </div>
              )}

              {selected.status !== "PENDING" && (
                <div style={{ marginTop: 16, padding: 12, background: "var(--bg)", borderRadius: 8, fontSize: 13 }}>
                  <span className={`badge ${statusConfig[selected.status].badge}`}>{statusConfig[selected.status].label}</span>
                  {selected.reviewNote && <p style={{ marginTop: 8, color: "var(--text-muted)" }}>{selected.reviewNote}</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {acceptResult && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Application accepted ✅</span>
            </div>
            <div className="modal-body">
              <p className="text-muted text-sm" style={{ marginBottom: 16 }}>
                Accounts have been created. Share these credentials with the applicant.
              </p>
              <div style={{ background: "var(--bg)", borderRadius: 8, padding: 14, marginBottom: 12, fontSize: 13 }}>
                <div className="font-semibold" style={{ marginBottom: 6 }}>Student account</div>
                <div className="text-muted">Email: <strong>{acceptResult!.user.email}</strong></div>
                <div className="text-muted">Temp password: <strong style={{ color: "var(--primary)", fontFamily: "monospace" }}>{acceptResult!.user.tempPassword}</strong></div>
              </div>
              {acceptResult!.parent && (
                <div style={{ background: "var(--bg)", borderRadius: 8, padding: 14, fontSize: 13 }}>
                  <div className="font-semibold" style={{ marginBottom: 6 }}>Parent account</div>
                  <div className="text-muted">Email: <strong>{acceptResult!.parent!.email}</strong></div>
                  <div className="text-muted">Temp password: <strong style={{ color: "var(--primary)", fontFamily: "monospace" }}>{acceptResult!.parent!.tempPassword}</strong></div>
                </div>
              )}
              <div className="form-actions">
                <button className="btn btn-primary" onClick={() => { setAcceptResult(null); setSelected(null); setReviewNote(""); }}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}