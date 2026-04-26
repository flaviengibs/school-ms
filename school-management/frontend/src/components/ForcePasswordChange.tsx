import { useState } from "react";
import { Lock } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";

interface Props { onDone: () => void }

export default function ForcePasswordChange({ onDone }: Props) {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    try {
      await api.post("/auth/change-password", { newPassword });
      toast.success("Password changed — please log in again");
      // Clear tokens and reload
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("contextToken");
      window.location.href = "/login";
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error");
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 40, width: "100%", maxWidth: 420, boxShadow: "var(--shadow-md)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Lock size={24} color="var(--primary)" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Change your password</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
            Your account was created with a temporary password. You must set a new password before continuing.
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New password</label>
            <input
              type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="Min 8 chars, uppercase, number, special" required autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm new password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" required />
          </div>
          <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: "center", height: 42, marginTop: 8 }} disabled={loading}>
            {loading ? <div className="spinner" /> : "Set new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
