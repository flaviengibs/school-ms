import { useEffect, useState, useRef } from "react";
import { Send, Inbox, Trash2, MailOpen, Search } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";

interface Message {
  id: number; subject: string; body: string; read: boolean; createdAt: string;
  sender?: { id: number; firstName: string; lastName: string; role: string };
  receiver?: { id: number; firstName: string; lastName: string; role: string };
}
interface User { id: number; firstName: string; lastName: string; role: string; email: string }

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: "Super admin", ADMIN: "Admin", TEACHER: "Teacher",
  STUDENT: "Student", PARENT: "Parent",
};
const roleBadge: Record<string, string> = {
  SUPER_ADMIN: "badge-purple", ADMIN: "badge-blue", TEACHER: "badge-green",
  STUDENT: "badge-yellow", PARENT: "badge-gray",
};

export default function MessagesPage() {
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Message | null>(null);
  const [showCompose, setShowCompose] = useState(false);

  // Recipient search
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientResults, setRecipientResults] = useState<User[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<User | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({ subject: "", body: "" });

  const load = () => {
    api.get(`/messages/${tab}`).then(r => setMessages(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, [tab]);

  // Search recipients with debounce
  useEffect(() => {
    if (!recipientSearch.trim()) { setRecipientResults([]); return; }
    const t = setTimeout(() => {
      api.get("/users", { params: { search: recipientSearch } })
        .then(r => setRecipientResults(r.data.slice(0, 8)))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [recipientSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const open = async (msg: Message) => {
    setSelected(msg);
    if (tab === "inbox" && !msg.read) {
      await api.put(`/messages/${msg.id}/read`).catch(() => {});
      load();
    }
  };

  const handleDelete = async (id: number) => {
    await api.delete(`/messages/${id}`).catch(() => {});
    setSelected(null);
    load();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipient) { toast.error("Please select a recipient"); return; }
    try {
      await api.post("/messages", { receiverId: selectedRecipient.id, ...form });
      toast.success("Message sent");
      setShowCompose(false);
      setForm({ subject: "", body: "" });
      setSelectedRecipient(null);
      setRecipientSearch("");
      if (tab === "sent") load();
    } catch { toast.error("Error sending message"); }
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Messages</div><div className="page-subtitle">Internal messaging</div></div>
        <button className="btn btn-primary" onClick={() => setShowCompose(true)}><Send size={14} /> Compose</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, height: "calc(100vh - 180px)" }}>
        {/* List */}
        <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div className="tabs" style={{ padding: "0 12px", marginBottom: 0 }}>
            <button className={`tab${tab === "inbox" ? " active" : ""}`} onClick={() => { setTab("inbox"); setSelected(null); }}>
              <Inbox size={13} style={{ display: "inline", marginRight: 4 }} />Inbox
            </button>
            <button className={`tab${tab === "sent" ? " active" : ""}`} onClick={() => { setTab("sent"); setSelected(null); }}>
              <Send size={13} style={{ display: "inline", marginRight: 4 }} />Sent
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {messages.length === 0 && <div className="empty-state"><p>No messages</p></div>}
            {messages.map(m => (
              <div
                key={m.id}
                onClick={() => open(m)}
                style={{
                  padding: "12px 16px", borderBottom: "1px solid var(--border)", cursor: "pointer",
                  background: selected?.id === m.id ? "var(--primary-light)" : (tab === "inbox" && !m.read ? "var(--bg)" : "transparent"),
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
                    {tab === "inbox"
                      ? (m.sender ? `${m.sender.firstName} ${m.sender.lastName}` : "Unknown")
                      : (m.receiver ? `To: ${m.receiver.firstName} ${m.receiver.lastName}` : "Unknown")}
                  </span>
                  {tab === "inbox" && !m.read && (
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--primary)", display: "inline-block" }} />
                  )}
                </div>
                <div style={{ fontSize: 13, fontWeight: tab === "inbox" && !m.read ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.subject}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {new Date(m.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {!selected ? (
            <div className="empty-state" style={{ margin: "auto" }}>
              <MailOpen size={40} />
              <p>Select a message to read</p>
            </div>
          ) : (
            <div style={{ padding: 24, flex: 1, overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{selected.subject}</h2>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--text-muted)" }}>
                    {selected.sender && selected.sender.id !== selected.receiver?.id && tab === "inbox" ? (
                      <>
                        <span>From: <strong>{selected.sender?.firstName} {selected.sender?.lastName}</strong></span>
                        <span className={`badge ${roleBadge[selected.sender?.role || ""]}`}>{roleLabel[selected.sender?.role || ""]}</span>
                      </>
                    ) : (
                      <span>To: <strong>{selected.receiver?.firstName} {selected.receiver?.lastName}</strong></span>
                    )}
                    <span>· {new Date(selected.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                {tab === "inbox" && (
                  <button className="btn-icon" style={{ color: "var(--danger)" }} onClick={() => handleDelete(selected.id)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <hr className="divider" />
              <p style={{ lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{selected.body}</p>
            </div>
          )}
        </div>
      </div>

      {showCompose && (
        <div className="modal-overlay" onClick={() => setShowCompose(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">New message</span>
              <button className="modal-close" onClick={() => setShowCompose(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSend}>
                {/* Recipient search */}
                <div className="form-group" ref={searchRef} style={{ position: "relative" }}>
                  <label className="form-label">To</label>
                  {selectedRecipient ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "1px solid var(--primary)", borderRadius: "var(--radius)", background: "var(--primary-light)" }}>
                      <span style={{ flex: 1, fontSize: 13 }}>
                        <strong>{selectedRecipient.firstName} {selectedRecipient.lastName}</strong>
                        <span className={`badge ${roleBadge[selectedRecipient.role]}`} style={{ marginLeft: 8 }}>{roleLabel[selectedRecipient.role]}</span>
                      </span>
                      <button type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16 }}
                        onClick={() => { setSelectedRecipient(null); setRecipientSearch(""); }}>✕</button>
                    </div>
                  ) : (
                    <>
                      <div style={{ position: "relative" }}>
                        <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                        <input
                          style={{ paddingLeft: 32 }}
                          placeholder="Search by name or email..."
                          value={recipientSearch}
                          onChange={e => { setRecipientSearch(e.target.value); setShowDropdown(true); }}
                          onFocus={() => setShowDropdown(true)}
                          autoComplete="off"
                        />
                      </div>
                      {showDropdown && recipientResults.length > 0 && (
                        <div style={{
                          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                          background: "var(--surface)", border: "1px solid var(--border)",
                          borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)", marginTop: 2,
                        }}>
                          {recipientResults.map(u => (
                            <div
                              key={u.id}
                              style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}
                              onMouseDown={() => { setSelectedRecipient(u); setShowDropdown(false); setRecipientSearch(""); }}
                            >
                              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                {u.firstName[0]}{u.lastName[0]}
                              </div>
                              <div>
                                <div style={{ fontWeight: 500 }}>{u.firstName} {u.lastName}</div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{u.email}</div>
                              </div>
                              <span className={`badge ${roleBadge[u.role]}`} style={{ marginLeft: "auto" }}>{roleLabel[u.role]}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={6} required />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCompose(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary"><Send size={13} /> Send</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
