import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import api from "../lib/api";
import { useSocket } from "../contexts/SocketContext";

interface Log { id: number; userId?: number; action: string; entity?: string; entityId?: number; details?: string; ip?: string; createdAt: string }

const actionColor: Record<string, string> = {
  LOGIN: "badge-green", LOGIN_FAILED: "badge-red", LOGOUT: "badge-gray",
  LOGOUT_ALL: "badge-yellow", REGISTER: "badge-blue", CHANGE_PASSWORD: "badge-purple",
  CREATE_GRADE: "badge-green", CREATE_ATTENDANCE: "badge-yellow",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const { onlineUsers } = useSocket();

  useEffect(() => {
    api.get("/audit?limit=100").then(r => setLogs(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Security & audit</div><div className="page-subtitle">System activity logs</div></div>
      </div>

      <div className="grid-2 mb-4">
        <div className="card">
          <div className="card-header"><span className="card-title"><Shield size={14} style={{ display: "inline", marginRight: 6 }} />Online users</span></div>
          <div className="card-body" style={{ padding: 0 }}>
            {onlineUsers.length === 0 && <div className="empty-state" style={{ padding: 20 }}><p>No users online</p></div>}
            {onlineUsers.map(u => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
                <span style={{ fontSize: 13 }}>{u.email}</span>
                <span className={`badge badge-gray`} style={{ marginLeft: "auto", fontSize: 11 }}>{u.role}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Recent activity summary</span></div>
          <div className="card-body">
            {["LOGIN", "LOGIN_FAILED", "CREATE_GRADE", "CREATE_ATTENDANCE", "CHANGE_PASSWORD"].map(action => {
              const count = logs.filter(l => l.action === action).length;
              return (
                <div key={action} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                  <span className={`badge ${actionColor[action] || "badge-gray"}`}>{action}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Audit log</span><span className="text-muted text-sm">{logs.length} entries</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Action</th><th>User ID</th><th>Entity</th><th>IP</th><th>Details</th><th>Date</th></tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td><span className={`badge ${actionColor[l.action] || "badge-gray"}`}>{l.action}</span></td>
                  <td className="text-muted">{l.userId || "—"}</td>
                  <td className="text-muted">{l.entity ? `${l.entity}${l.entityId ? ` #${l.entityId}` : ""}` : "—"}</td>
                  <td className="text-muted" style={{ fontFamily: "monospace", fontSize: 12 }}>{l.ip || "—"}</td>
                  <td className="text-muted" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.details || "—"}</td>
                  <td className="text-muted">{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!logs.length && <div className="empty-state"><p>No logs yet</p></div>}
        </div>
      </div>
    </div>
  );
}
