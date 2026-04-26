import { useEffect, useState } from "react";
import { AlertTriangle, Plus, Trash2, Search, CheckCircle } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";

interface Sanction {
  id: number; type: string; reason: string; hours?: number;
  scheduledAt?: string; suspendUntil?: string;
  resolved: boolean; resolvedAt?: string; createdAt: string;
  user: { firstName: string; lastName: string; email: string; status: string };
}
interface UserOption {
  id: number; firstName: string; lastName: string; email: string; role: string;
  blameCount: number; crossCount: number; warningCount: number; status: string; suspendUntil?: string;
}
interface Settings { crossThreshold: number; blameSuspendDays: number }

const TYPES = [
  { value: "CROSS",         label: "Cross",                    color: "#f59e0b", bg: "#fef9c3", desc: "Accumulates — auto-detention at threshold" },
  { value: "DETENTION",     label: "Detention",                color: "#ef4444", bg: "#fee2e2", desc: "Hours of detention" },
  { value: "WORK_INTEREST", label: "Work of general interest", color: "#8b5cf6", bg: "#ede9fe", desc: "Community service hours" },
  { value: "BLAME",         label: "Blame",                    color: "#dc2626", bg: "#fee2e2", desc: "3 blames = account suspended" },
  { value: "WARNING",       label: "Major warning",            color: "#7f1d1d", bg: "#fecaca", desc: "3 warnings = permanent exclusion" },
];

const typeConfig = Object.fromEntries(TYPES.map(t => [t.value, t]));
const statusBadge: Record<string, string> = { ACTIVE: "badge-green", SUSPENDED: "badge-yellow", BANNED: "badge-red", INACTIVE: "badge-gray" };

export default function BlamesPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [settings, setSettings] = useState<Settings>({ crossThreshold: 5, blameSuspendDays: 3 });
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: "CROSS", reason: "", hours: "", scheduledAt: "", suspendDays: "" });
  const [loading, setLoading] = useState(false);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user?.role || "");
  const canIssue = ["TEACHER", "ADMIN", "SUPER_ADMIN"].includes(user?.role || "");

  const loadUsers = () => {
    api.get("/users", { params: { search: search || undefined } })
      .then(async r => {
        const filtered = r.data.filter((u: any) => u.role === "STUDENT");
        const details = await Promise.all(filtered.map((u: any) => api.get(`/users/${u.id}`).then(res => res.data)));
        setUsers(details.map((d: any) => ({
          id: d.id, firstName: d.firstName, lastName: d.lastName, email: d.email, role: d.role,
          blameCount: d.blameCount ?? 0, crossCount: d.crossCount ?? 0, warningCount: d.warningCount ?? 0,
          status: d.status, suspendUntil: d.suspendUntil,
        })));
      }).catch(() => {});
  };

  const loadSanctions = () => {
    if (!selectedUser) return;
    api.get("/blames", { params: { userId: selectedUser.id, type: typeFilter || undefined } })
      .then(r => setSanctions(r.data)).catch(() => {});
  };

  useEffect(() => { loadUsers(); }, [search]);
  useEffect(() => { loadSanctions(); }, [selectedUser, typeFilter]);
  useEffect(() => {
    api.get("/settings").then(r => setSettings({ crossThreshold: r.data.crossThreshold ?? 5, blameSuspendDays: r.data.blameSuspendDays ?? 3 })).catch(() => {});
  }, []);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setLoading(true);
    try {
      const { data } = await api.post("/blames", {
        userId: selectedUser.id,
        type: form.type,
        reason: form.reason,
        hours: form.hours || undefined,
        scheduledAt: form.scheduledAt || undefined,
      });

      let msg = `${typeConfig[form.type]?.label} issued`;
      if (data.autoSanction) msg += ` — ${data.autoSanction}`;
      if (data.newStatus === "SUSPENDED") msg += ` — suspended until ${new Date(data.suspendUntil).toLocaleDateString()}`;
      if (data.newStatus === "BANNED") msg += " — account permanently excluded";
      toast.success(msg, { duration: 6000 });

      setShowModal(false);
      setForm({ type: "CROSS", reason: "", hours: "", scheduledAt: "", suspendDays: "" });
      loadSanctions();
      loadUsers();
      // Refresh selected user counters
      setSelectedUser(u => u ? { ...u, blameCount: data.newBlameCount, crossCount: data.newCrossCount, warningCount: data.newWarningCount, status: data.newStatus } : u);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error");
    } finally { setLoading(false); }
  };

  const handleRevoke = async (id: number) => {
    if (!confirm("Revoke this sanction?")) return;
    try {
      await api.delete(`/blames/${id}`);
      toast.success("Sanction revoked");
      loadSanctions(); loadUsers();
    } catch { toast.error("Error"); }
  };

  const handleResolve = async (id: number) => {
    try {
      await api.put(`/blames/${id}/resolve`);
      toast.success("Marked as resolved");
      loadSanctions();
    } catch { toast.error("Error"); }
  };

  const handleSetStatus = async (status: string) => {
    if (!selectedUser) return;
    const suspendDays = status === "SUSPENDED" ? prompt(`Suspend for how many days? (default: ${settings.blameSuspendDays})`) || String(settings.blameSuspendDays) : undefined;
    try {
      await api.put(`/blames/users/${selectedUser.id}/status`, { status, suspendDays });
      toast.success(`Status set to ${status.toLowerCase()}`);
      loadUsers();
      setSelectedUser(u => u ? { ...u, status } : u);
    } catch { toast.error("Error"); }
  };

  const needsHours = (type: string) => ["DETENTION", "WORK_INTEREST"].includes(type);
  const activeSanctions = sanctions.filter(s => !s.resolved);
  const resolvedSanctions = sanctions.filter(s => s.resolved);

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Disciplinary records</div><div className="page-subtitle">Sanctions and blames management</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
        {/* User list */}
        <div className="card" style={{ alignSelf: "start" }}>
          <div className="card-header" style={{ padding: "10px 12px" }}>
            <div className="search-bar" style={{ width: "100%" }}>
              <Search size={13} />
              <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            {users.map(u => (
              <div
                key={u.id}
                onClick={() => setSelectedUser(u)}
                style={{
                  padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)",
                  background: selectedUser?.id === u.id ? "var(--primary-light)" : "transparent",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{u.firstName} {u.lastName}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{u.role}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                    <span className={`badge ${statusBadge[u.status] || "badge-gray"}`} style={{ fontSize: 10 }}>{u.status}</span>
                    <div style={{ display: "flex", gap: 3 }}>
                      {u.blameCount > 0 && <span className="badge badge-red" style={{ fontSize: 9 }}>B:{u.blameCount}</span>}
                      {u.crossCount > 0 && <span className="badge badge-yellow" style={{ fontSize: 9 }}>C:{u.crossCount}</span>}
                      {u.warningCount > 0 && <span style={{ background: "#7f1d1d", color: "#fff", fontSize: 9, padding: "1px 5px", borderRadius: 999, fontWeight: 700 }}>W:{u.warningCount}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!users.length && <div className="empty-state" style={{ padding: 20 }}><p>No users</p></div>}
          </div>
        </div>

        {/* Detail */}
        {!selectedUser ? (
          <div className="card empty-state" style={{ padding: 48 }}>
            <AlertTriangle size={40} />
            <p>Select a user to manage their sanctions</p>
          </div>
        ) : (
          <div>
            {/* User header */}
            <div className="card mb-4">
              <div className="card-body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div className="font-semibold" style={{ fontSize: 16 }}>{selectedUser.firstName} {selectedUser.lastName}</div>
                    <div className="text-muted text-sm">{selectedUser.email} · {selectedUser.role}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      <span className={`badge ${statusBadge[selectedUser.status] || "badge-gray"}`}>{selectedUser.status}</span>
                      {selectedUser.suspendUntil && new Date(selectedUser.suspendUntil) > new Date() && (
                        <span className="badge badge-yellow">Until {new Date(selectedUser.suspendUntil).toLocaleDateString()}</span>
                      )}
                      {/* Counters */}
                      {TYPES.map(t => {
                        const count = t.value === "BLAME" ? selectedUser.blameCount : t.value === "CROSS" ? selectedUser.crossCount : t.value === "WARNING" ? selectedUser.warningCount : 0;
                        if (!count) return null;
                        return (
                          <span key={t.value} style={{ background: t.bg, color: t.color, fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 600 }}>
                            {count} {t.label.toLowerCase()}{count > 1 ? "s" : ""}
                          </span>
                        );
                      })}
                    </div>
                    {/* Progress bars */}
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                      <ProgressBar label="Crosses" value={selectedUser.crossCount} max={settings.crossThreshold} color="#f59e0b" />
                      <ProgressBar label="Blames" value={selectedUser.blameCount} max={3} color="#ef4444" />
                      <ProgressBar label="Warnings" value={selectedUser.warningCount} max={3} color="#7f1d1d" />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {isAdmin && selectedUser.status === "ACTIVE" && (
                      <button className="btn btn-sm btn-danger" onClick={() => handleSetStatus("SUSPENDED")}>Suspend</button>
                    )}
                    {isAdmin && selectedUser.status === "SUSPENDED" && (
                      <button className="btn btn-sm btn-success" onClick={() => handleSetStatus("ACTIVE")}>Reactivate</button>
                    )}
                    {isSuperAdmin && selectedUser.status !== "BANNED" && (
                      <button className="btn btn-sm btn-danger" style={{ background: "#7f1d1d" }} onClick={() => handleSetStatus("BANNED")}>Exclude</button>
                    )}
                    {isSuperAdmin && selectedUser.status === "BANNED" && (
                      <button className="btn btn-sm btn-success" onClick={() => handleSetStatus("ACTIVE")}>Reinstate</button>
                    )}
                    {canIssue && (
                      <button className="btn btn-sm btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={12} /> Issue sanction
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sanction list */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Sanctions</span>
                <div className="flex gap-2">
                  <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: "auto", fontSize: 12 }}>
                    <option value="">All types</option>
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <span className="text-muted text-sm">{activeSanctions.length} active</span>
                </div>
              </div>

              {activeSanctions.length === 0 && resolvedSanctions.length === 0 && (
                <div className="empty-state" style={{ padding: 32 }}><p>No sanctions recorded</p></div>
              )}

              {activeSanctions.map(s => <SanctionRow key={s.id} s={s} isSuperAdmin={isSuperAdmin} canIssue={canIssue} onRevoke={handleRevoke} onResolve={handleResolve} />)}

              {resolvedSanctions.length > 0 && (
                <>
                  <div style={{ padding: "8px 16px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted)", background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
                    Resolved ({resolvedSanctions.length})
                  </div>
                  {resolvedSanctions.map(s => <SanctionRow key={s.id} s={s} isSuperAdmin={isSuperAdmin} canIssue={canIssue} onRevoke={handleRevoke} onResolve={handleResolve} />)}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Issue sanction — {selectedUser.firstName} {selectedUser.lastName}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleIssue}>
                {/* Type selector */}
                <div className="form-group">
                  <label className="form-label">Sanction type</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {TYPES.map(t => (
                      <label key={t.value} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                        border: `2px solid ${form.type === t.value ? t.color : "var(--border)"}`,
                        borderRadius: 8, cursor: "pointer",
                        background: form.type === t.value ? t.bg : "transparent",
                        transition: "all .15s",
                      }}>
                        <input type="radio" name="type" value={t.value} checked={form.type === t.value}
                          onChange={() => setForm(f => ({ ...f, type: t.value }))} style={{ width: "auto" }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: t.color }}>{t.label}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason</label>
                  <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2} required />
                </div>

                {needsHours(form.type) && (
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Hours</label>
                      <input type="number" step="0.5" min="0.5" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Scheduled date (optional)</label>
                      <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
                    </div>
                  </div>
                )}

                {/* Consequence preview */}
                <div style={{ padding: 10, background: "var(--bg)", borderRadius: 8, fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                  {form.type === "CROSS" && `Current crosses: ${selectedUser.crossCount}/${settings.crossThreshold}. ${selectedUser.crossCount + 1 >= settings.crossThreshold ? "⚠️ This will trigger an automatic detention." : `${settings.crossThreshold - selectedUser.crossCount - 1} more before detention.`}`}
                  {form.type === "BLAME" && `Current blames: ${selectedUser.blameCount}/3. ${selectedUser.blameCount + 1 >= 3 ? `⚠️ This will suspend the account for ${settings.blameSuspendDays} days.` : `${3 - selectedUser.blameCount - 1} more before suspension.`}`}
                  {form.type === "WARNING" && `Current warnings: ${selectedUser.warningCount}/3. ${selectedUser.warningCount + 1 >= 3 ? "⚠️ This will permanently exclude the account." : `${3 - selectedUser.warningCount - 1} more before exclusion.`}`}
                  {form.type === "DETENTION" && "A detention will be recorded and the student notified."}
                  {form.type === "WORK_INTEREST" && "A work of general interest will be recorded."}
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-danger" disabled={loading}>
                    {loading ? <div className="spinner" /> : "Issue sanction"}
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

function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
      <span style={{ width: 60, color: "var(--text-muted)", flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width .3s" }} />
      </div>
      <span style={{ color, fontWeight: 600, width: 30, textAlign: "right" }}>{value}/{max}</span>
    </div>
  );
}

function SanctionRow({ s, isSuperAdmin, canIssue, onRevoke, onResolve }: {
  s: Sanction; isSuperAdmin: boolean; canIssue: boolean;
  onRevoke: (id: number) => void; onResolve: (id: number) => void;
}) {
  const cfg = typeConfig[s.type] || { label: s.type, color: "#64748b", bg: "#f1f5f9" };
  return (
    <div style={{
      padding: "12px 16px", borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
      opacity: s.resolved ? 0.6 : 1,
    }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <AlertTriangle size={14} color={cfg.color} />
        </div>
        <div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: "1px 7px", borderRadius: 999 }}>{cfg.label}</span>
            {s.resolved && <span className="badge badge-green" style={{ fontSize: 10 }}>Resolved</span>}
          </div>
          <div style={{ fontSize: 13 }}>{s.reason}</div>
          {s.hours && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.hours}h{s.scheduledAt ? ` · ${new Date(s.scheduledAt).toLocaleString()}` : ""}</div>}
          {s.suspendUntil && <div style={{ fontSize: 11, color: "#b91c1c", marginTop: 2 }}>Suspended until {new Date(s.suspendUntil).toLocaleDateString()}</div>}
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{new Date(s.createdAt).toLocaleString()}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {canIssue && !s.resolved && (
          <button className="btn-icon btn-sm" style={{ border: "none", color: "var(--success)" }} title="Mark resolved" onClick={() => onResolve(s.id)}>
            <CheckCircle size={14} />
          </button>
        )}
        {isSuperAdmin && (
          <button className="btn-icon btn-sm" style={{ border: "none", color: "var(--danger)" }} title="Revoke" onClick={() => onRevoke(s.id)}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
