import { useEffect, useState } from "react";
import { User, BarChart2, Lock } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";

interface AttendanceStats { absences: number; lates: number; total: number; justified: number; unjustified: number }

export default function ProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [form, setForm] = useState({ firstName: user?.firstName || "", lastName: user?.lastName || "", phone: "" });
  const [saving, setSaving] = useState(false);

  // Password change
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get(`/users/${user.id}`).then(r => {
      setForm({ firstName: r.data.firstName, lastName: r.data.lastName, phone: r.data.phone || "" });
      if (r.data.student) {
        api.get(`/attendance/stats/${r.data.student.id}`).then(s => setStats(s.data)).catch(() => {});
      }
    }).catch(() => {});
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/users/${user!.id}`, form);
      toast.success("Profile updated");
    } catch { toast.error("Error"); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) { toast.error("Passwords do not match"); return; }
    setPwSaving(true);
    try {
      await api.post("/auth/change-password", { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success("Password changed — please log in again");
      setTimeout(() => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }, 1500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error");
    } finally { setPwSaving(false); }
  };

  const roleLabel: Record<string, string> = {
    OWNER: "Platform owner", SUPER_ADMIN: "Super admin", ADMIN: "Admin",
    TEACHER: "Teacher", STUDENT: "Student", PARENT: "Parent",
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Profile</div><div className="page-subtitle">Your account information</div></div>
      </div>

      <div className="grid-2">
        {/* Personal info */}
        <div className="card">
          <div className="card-header"><span className="card-title"><User size={15} style={{ display: "inline", marginRight: 6 }} />Personal info</span></div>
          <div className="card-body">
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div className="user-avatar" style={{ width: 56, height: 56, fontSize: 20 }}>
                {user?.firstName[0]}{user?.lastName[0]}
              </div>
              <div>
                <div className="font-semibold" style={{ fontSize: 16 }}>{user?.firstName} {user?.lastName}</div>
                <div className="text-muted">{user?.email}</div>
                <span className="badge badge-blue" style={{ marginTop: 4 }}>{roleLabel[user?.role || ""]}</span>
              </div>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group"><label className="form-label">First name</label><input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Last name</label><input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
              </div>
              <div className="form-group"><label className="form-label">Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
              </div>
            </form>
          </div>
        </div>

        {/* Password change */}
        <div className="card">
          <div className="card-header"><span className="card-title"><Lock size={15} style={{ display: "inline", marginRight: 6 }} />Change password</span></div>
          <div className="card-body">
            <form onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label className="form-label">Current password</label>
                <input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">New password</label>
                <input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Min 8 chars, uppercase, number, special" required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm new password</label>
                <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required />
              </div>
              <div style={{ padding: 10, background: "var(--bg)", borderRadius: 8, fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                Changing your password will sign you out of all sessions.
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={pwSaving}>{pwSaving ? "Saving..." : "Change password"}</button>
              </div>
            </form>
          </div>
        </div>

        {/* Attendance stats for students */}
        {stats && (
          <div className="card">
            <div className="card-header"><span className="card-title"><BarChart2 size={15} style={{ display: "inline", marginRight: 6 }} />Attendance stats</span></div>
            <div className="card-body">
              <div className="stats-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                {[
                  { label: "Total records", value: stats.total, color: "var(--primary)" },
                  { label: "Absences", value: stats.absences, color: "var(--danger)" },
                  { label: "Delays", value: stats.lates, color: "var(--warning)" },
                  { label: "Justified", value: stats.justified, color: "var(--success)" },
                  { label: "Unjustified", value: stats.unjustified, color: "var(--danger)" },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: "center", padding: 12, background: "var(--bg)", borderRadius: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div className="text-muted text-sm">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
