import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useSocket } from "../contexts/SocketContext";

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useSocket();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const icons: Record<string, string> = { grade: "📝", attendance: "🕐", announcement: "📢" };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="btn-icon"
        style={{ position: "relative", border: "none" }}
        onClick={() => { setOpen(o => !o); if (!open) markAllRead(); }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            background: "var(--danger)", color: "#fff",
            borderRadius: "999px", fontSize: 10, fontWeight: 700,
            minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 3px",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 8px)",
          width: 320, background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 10, boxShadow: "var(--shadow-md)", zIndex: 300, overflow: "hidden",
        }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: 13 }}>
            Notifications
          </div>
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {notifications.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                No notifications
              </div>
            )}
            {notifications.map(n => (
              <div key={n.id} style={{
                padding: "10px 16px", borderBottom: "1px solid var(--border)",
                background: n.read ? "transparent" : "var(--primary-light)",
                fontSize: 13,
              }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 16 }}>{icons[n.type]}</span>
                  <div>
                    <div>{n.message}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {n.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
