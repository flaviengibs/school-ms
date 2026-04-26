import { useEffect, useState } from "react";
import { Settings, Save } from "lucide-react";
import api, { getFileUrl } from "../lib/api";
import toast from "react-hot-toast";
import { FormFieldEditor, FieldConfig } from "../components/FormBuilder";

interface SchoolSettings {
  name: string; address: string; phone: string; email: string;
  website: string; logoUrl: string; principalName: string;
  crossThreshold: number; blameSuspendDays: number;
  studentFormFields: FieldConfig[];
  teacherFormFields: FieldConfig[];
  customSections: { id: string; label: string; deletable?: boolean }[];
}

export default function SettingsPage() {
  const [form, setForm] = useState<SchoolSettings>({
    name: "", address: "", phone: "", email: "",
    website: "", logoUrl: "", principalName: "",
    crossThreshold: 5, blameSuspendDays: 3,
    studentFormFields: [], teacherFormFields: [], customSections: [],
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"school" | "forms" | "discipline">("school");

  useEffect(() => {
    api.get("/settings").then(r => {
      setForm({
        name: r.data.name || "",
        address: r.data.address || "",
        phone: r.data.phone || "",
        email: r.data.email || "",
        website: r.data.website || "",
        logoUrl: r.data.logoUrl || "",
        principalName: r.data.principalName || "",
        crossThreshold: r.data.crossThreshold ?? 5,
        blameSuspendDays: r.data.blameSuspendDays ?? 3,
        studentFormFields: r.data.studentFormFields || [],
        teacherFormFields: r.data.teacherFormFields || [],
        customSections: r.data.customSections || [],
      });
    }).catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/settings", form);
      toast.success("Settings saved");
    } catch { toast.error("Error saving settings"); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">School settings</div>
          <div className="page-subtitle">Configure your school and application forms</div>
        </div>
      </div>

      <div className="tabs">
        {(["school", "forms", "discipline"] as const).map(t => (
          <button key={t} className={`tab${activeTab === t ? " active" : ""}`} onClick={() => setActiveTab(t)}>
            {t === "school" ? "School info" : t === "forms" ? "Application forms" : "Discipline"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave}>
        {activeTab === "school" && (
          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <span className="card-title"><Settings size={14} style={{ display: "inline", marginRight: 6 }} />School information</span>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">School name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Website</label>
                    <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Principal name</label>
                    <input value={form.principalName} onChange={e => setForm(f => ({ ...f, principalName: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Logo URL</label>
                  <input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://..." />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <Save size={13} /> {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Bulletin header preview</span></div>
              <div className="card-body">
                <div style={{ background: "#1e293b", borderRadius: 8, padding: "16px 20px", color: "#fff" }}>
                  {form.logoUrl && (
                    <img src={getFileUrl(form.logoUrl)} alt="logo" style={{ height: 40, marginBottom: 10, borderRadius: 4 }} onError={e => (e.currentTarget.style.display = "none")} />
                  )}
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{form.name || "School name"}</div>
                  {form.address && <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginTop: 4 }}>{form.address}</div>}
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 4 }}>
                    {[form.phone, form.email, form.website].filter(Boolean).join("  ·  ")}
                  </div>
                  {form.principalName && <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 2 }}>Principal: {form.principalName}</div>}
                </div>
                <p className="text-muted text-sm mt-4">This header appears at the top of every generated PDF bulletin.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "forms" && (
          <div className="grid-2">
            <div className="card">
              <div className="card-header"><span className="card-title">Student application form</span></div>
              <div className="card-body">
                <p className="text-muted text-sm mb-4">
                  Toggle fields on/off, rename labels, mark as required, and add your own custom questions.
                  The "parent" section only appears for student applicants.
                </p>
                {form.studentFormFields.length > 0
                  ? <FormFieldEditor fields={form.studentFormFields} onChange={f => setForm(s => ({ ...s, studentFormFields: f }))} customSections={form.customSections} onSectionsChange={s => setForm(f => ({ ...f, customSections: s }))} title="" />
                  : <p className="text-muted text-sm">Loading...</p>}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-title">Teacher application form</span></div>
              <div className="card-body">
                <p className="text-muted text-sm mb-4">
                  Configure the fields shown when someone applies as a teacher.
                  Academic history fields like "previous average" are not available for teachers.
                </p>
                {form.teacherFormFields.length > 0
                  ? <FormFieldEditor fields={form.teacherFormFields} onChange={f => setForm(s => ({ ...s, teacherFormFields: f }))} customSections={form.customSections} onSectionsChange={s => setForm(f => ({ ...f, customSections: s }))} title="" />
                  : <p className="text-muted text-sm">Loading...</p>}
              </div>
            </div>
            <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={13} /> {saving ? "Saving..." : "Save form settings"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "discipline" && (
          <div className="card" style={{ maxWidth: 560 }}>
            <div className="card-header"><span className="card-title">Disciplinary thresholds</span></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Crosses before detention</label>
                <input type="number" min="1" max="20" value={form.crossThreshold}
                  onChange={e => setForm(f => ({ ...f, crossThreshold: parseInt(e.target.value) || 5 }))} />
                <div className="text-muted text-sm" style={{ marginTop: 4 }}>When a student reaches this many crosses, a 1h detention is automatically issued and crosses reset to 0.</div>
              </div>
              <div className="form-group">
                <label className="form-label">Suspension duration after 3 blames (days)</label>
                <input type="number" min="1" max="30" value={form.blameSuspendDays}
                  onChange={e => setForm(f => ({ ...f, blameSuspendDays: parseInt(e.target.value) || 3 }))} />
                <div className="text-muted text-sm" style={{ marginTop: 4 }}>Account is suspended for this many days when a student accumulates 3 blames. Blames reset after suspension.</div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={13} /> {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
