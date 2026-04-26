import { useEffect, useState, useRef } from "react";
import { Plus, Trash2, BookOpen, CheckCircle, Clock, Paperclip, Download, FileText } from "lucide-react";
import api, { getFileUrl } from "../lib/api";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";

interface Homework {
  id: number; title: string; description?: string; dueDate: string; createdAt: string;
  subject: { name: string }; class: { name: string };
  teacher: { user: { firstName: string; lastName: string } };
  _count: { submissions: number };
}
interface Subject { id: number; name: string }
interface Class { id: number; name: string }

const isOverdue = (due: string) => new Date(due) < new Date();

const fileIcon = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) return "🖼️";
  if (ext === "pdf") return "📄";
  if (["doc", "docx"].includes(ext || "")) return "📝";
  if (["xls", "xlsx"].includes(ext || "")) return "📊";
  if (["zip", "rar"].includes(ext || "")) return "🗜️";
  return "📎";
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function HomeworkPage() {
  const { user } = useAuth();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [filterClass, setFilterClass] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Homework | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submitContent, setSubmitContent] = useState("");
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ title: "", description: "", subjectId: "", classId: "", dueDate: "" });

  const canCreate = ["TEACHER", "ADMIN", "SUPER_ADMIN"].includes(user?.role || "");
  const isStudent = user?.role === "STUDENT";

  const load = () => {
    const params: Record<string, string> = {};
    if (filterClass) params.classId = filterClass;
    api.get("/homework", { params }).then(r => setHomework(r.data)).catch(() => {});
  };

  useEffect(() => {
    load();
    api.get("/subjects").then(r => setSubjects(r.data)).catch(() => {});
    api.get("/classes").then(r => setClasses(r.data)).catch(() => {});
  }, [filterClass]);

  const openDetail = async (hw: Homework) => {
    setSelected(hw);
    if (!isStudent) {
      api.get(`/homework/${hw.id}/submissions`).then(r => setSubmissions(r.data)).catch(() => {});
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/homework", form);
      toast.success("Homework created");
      setShowModal(false);
      load();
    } catch { toast.error("Error"); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitContent && !submitFile) { toast.error("Add a text answer or attach a file"); return; }
    try {
      const formData = new FormData();
      if (submitContent) formData.append("content", submitContent);
      if (submitFile) formData.append("file", submitFile);

      await api.post(`/homework/${selected!.id}/submit`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Submitted");
      setSubmitContent("");
      setSubmitFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch { toast.error("Error"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this homework?")) return;
    try { await api.delete(`/homework/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Error"); }
  };

  const typeColor = (due: string) => isOverdue(due) ? "badge-red" : "badge-green";

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Homework</div><div className="page-subtitle">Assignments and submissions</div></div>
        {canCreate && <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={14} /> New assignment</button>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap: 16 }}>
        <div>
          <div className="card mb-4">
            <div className="card-header">
              <select value={filterClass} onChange={e => setFilterClass(e.target.value)} style={{ width: "auto" }}>
                <option value="">All classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <span className="text-muted text-sm">{homework.length} assignments</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {homework.map(hw => (
              <div
                key={hw.id}
                className="card"
                style={{ cursor: "pointer", borderLeft: `3px solid ${isOverdue(hw.dueDate) ? "var(--danger)" : "var(--success)"}` }}
                onClick={() => openDetail(hw)}
              >
                <div className="card-body" style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{hw.title}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                        {hw.subject.name} · {hw.class.name} · {hw.teacher.user.firstName} {hw.teacher.user.lastName}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className={`badge ${typeColor(hw.dueDate)}`}>
                        {isOverdue(hw.dueDate) ? "Overdue" : "Active"}
                      </span>
                      {!isStudent && <span className="badge badge-gray">{hw._count.submissions} submissions</span>}
                      {canCreate && (
                        <button className="btn-icon btn-sm" style={{ color: "var(--danger)", border: "none" }}
                          onClick={e => { e.stopPropagation(); handleDelete(hw.id); }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
                    <Clock size={12} /> Due: {new Date(hw.dueDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
            {!homework.length && <div className="empty-state"><BookOpen size={40} /><p>No assignments</p></div>}
          </div>
        </div>

        {selected && (
          <div className="card" style={{ alignSelf: "start", position: "sticky", top: 80 }}>
            <div className="card-header">
              <span className="card-title">{selected.title}</span>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="card-body">
              <div className="text-muted text-sm mb-4">{selected.subject.name} · {selected.class.name}</div>
              {selected.description && <p style={{ marginBottom: 16, lineHeight: 1.6 }}>{selected.description}</p>}
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
                Due: <strong>{new Date(selected.dueDate).toLocaleString()}</strong>
              </div>

              {isStudent && (
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">Your answer (optional)</label>
                    <textarea value={submitContent} onChange={e => setSubmitContent(e.target.value)} rows={3} placeholder="Write your answer..." />
                  </div>

                  {/* File upload zone */}
                  <div className="form-group">
                    <label className="form-label">Attach a file (optional)</label>
                    <div
                      style={{
                        border: `2px dashed ${submitFile ? "var(--primary)" : "var(--border)"}`,
                        borderRadius: 8, padding: "16px 12px", textAlign: "center", cursor: "pointer",
                        background: submitFile ? "var(--primary-light)" : "var(--bg)",
                        transition: "all .15s",
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setSubmitFile(f); }}
                    >
                      {submitFile ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                          <span style={{ fontSize: 20 }}>{fileIcon(submitFile.name)}</span>
                          <div style={{ textAlign: "left" }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{submitFile.name}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatSize(submitFile.size)}</div>
                          </div>
                          <button type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", marginLeft: 8 }}
                            onClick={e => { e.stopPropagation(); setSubmitFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div>
                          <Paperclip size={20} color="var(--text-muted)" style={{ margin: "0 auto 6px" }} />
                          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Click or drag a file here</div>
                          <div style={{ fontSize: 11, color: "var(--border)", marginTop: 2 }}>PDF, Word, images, ZIP — max 20 MB</div>
                        </div>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" style={{ display: "none" }}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv,.zip"
                      onChange={e => { const f = e.target.files?.[0]; if (f) setSubmitFile(f); }} />
                  </div>

                  <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: "center" }}>
                    <CheckCircle size={14} /> Submit
                  </button>
                </form>
              )}

              {!isStudent && submissions.length > 0 && (
                <div>
                  <div className="font-semibold mb-4" style={{ fontSize: 13 }}>Submissions ({submissions.length})</div>
                  {submissions.map(s => (
                    <div key={s.id} style={{ padding: "10px 12px", background: "var(--bg)", borderRadius: 6, marginBottom: 8, fontSize: 13 }}>
                      <div className="font-semibold">{s.user.firstName} {s.user.lastName}</div>
                      {s.content && <div className="text-muted" style={{ marginTop: 4 }}>{s.content}</div>}
                      {s.fileUrl && (
                        <a
                          href={getFileUrl(s.fileUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12, color: "var(--primary)", textDecoration: "none" }}
                        >
                          <span>{fileIcon(s.fileName || "")}</span>
                          <span>{s.fileName}</span>
                          {s.fileSize && <span style={{ color: "var(--text-muted)" }}>({formatSize(s.fileSize)})</span>}
                          <Download size={11} />
                        </a>
                      )}
                      {s.grade && <div style={{ marginTop: 6, color: "var(--success)", fontWeight: 600 }}>Grade: {s.grade}/20</div>}
                      {s.feedback && <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>{s.feedback}</div>}
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{new Date(s.submittedAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">New assignment</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreate}>
                <div className="form-group"><label className="form-label">Title</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
                <div className="form-group"><label className="form-label">Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Subject</label>
                    <select value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))} required>
                      <option value="">Select</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Class</label>
                    <select value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))} required>
                      <option value="">Select</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Due date</label><input type="datetime-local" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} required /></div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
