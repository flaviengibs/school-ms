import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import toast from "react-hot-toast";
import type { FieldConfig } from "../components/FormBuilder";

type Tab = "login" | "apply";

// Render a single dynamic field
function DynField({ field, value, onChange }: { field: FieldConfig; value: string | string[]; onChange: (v: string | string[]) => void }) {
  const props = { placeholder: field.placeholder || "", required: field.required };

  if (field.type === "textarea") return <textarea value={value as string} onChange={e => onChange(e.target.value)} {...props} rows={3} />;
  if (field.type === "yesno") {
    return (
      <div style={{ display: "flex", gap: 8 }}>
        {["Yes", "No"].map(opt => (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            className={`btn ${(value as string) === opt ? "btn-primary" : "btn-secondary"}`} style={{ flex: 1, justifyContent: "center" }}>
            {opt}
          </button>
        ))}
      </div>
    );
  }
  if (field.type === "radio") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {(field.options || []).map(opt => (
          <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
            <input type="radio" name={field.id} checked={(value as string) === opt} onChange={() => onChange(opt)} style={{ width: "auto" }} />
            {opt}
          </label>
        ))}
      </div>
    );
  }
  if (field.type === "checkbox") {
    const vals = Array.isArray(value) ? value : [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {(field.options || []).map(opt => (
          <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
            <input type="checkbox" checked={vals.includes(opt)}
              onChange={e => onChange(e.target.checked ? [...vals, opt] : vals.filter(v => v !== opt))} style={{ width: "auto" }} />
            {opt}
          </label>
        ))}
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <select value={value as string} onChange={e => onChange(e.target.value)} {...props}>
        <option value="">Select an option</option>
        {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }
  if (field.type === "scale") {
    const min = field.scaleMin ?? 1, max = field.scaleMax ?? 10;
    return (
      <div>
        <input type="range" min={min} max={max} value={value as string || min} onChange={e => onChange(e.target.value)}
          style={{ width: "100%", marginBottom: 8 }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)" }}>
          <span>{field.scaleMinLabel || min}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--primary)" }}>{value || min}</span>
          <span>{field.scaleMaxLabel || max}</span>
        </div>
      </div>
    );
  }
  if (field.type === "file") {
    return <input type="file" onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f.name); }} />;
  }
  if (field.type === "other") {
    const vals = Array.isArray(value) ? value : [];
    const hasOther = vals.includes("__other__");
    return (
      <div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
          {(field.options || []).map(opt => (
            <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
              <input type="checkbox" checked={vals.includes(opt)}
                onChange={e => onChange(e.target.checked ? [...vals.filter(v => v !== "__other__"), opt] : vals.filter(v => v !== opt))} style={{ width: "auto" }} />
              {opt}
            </label>
          ))}
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
            <input type="checkbox" checked={hasOther} onChange={e => onChange(e.target.checked ? [...vals, "__other__"] : vals.filter(v => v !== "__other__"))} style={{ width: "auto" }} />
            Other:
          </label>
        </div>
        {hasOther && <input placeholder="Please specify..." onChange={e => onChange([...vals.filter(v => v !== "__other__" && !v.startsWith("__other_text:")), "__other__", `__other_text:${e.target.value}`])} style={{ fontSize: 13 }} />}
      </div>
    );
  }
  return <input type={field.type} value={value as string} onChange={e => onChange(e.target.value)} {...props} />;
}

export default function LoginPage() {
  const { login } = useAuth();
  const [tab, setTab] = useState<Tab>("login");
  const [loading, setLoading] = useState(false);

  // Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Application
  const [role, setRole] = useState("STUDENT");
  const [appStep, setAppStep] = useState(1);
  const [appValues, setAppValues] = useState<Record<string, string | string[]>>({});
  const [appDone, setAppDone] = useState(false);
  const [studentFields, setStudentFields] = useState<FieldConfig[]>([]);
  const [teacherFields, setTeacherFields] = useState<FieldConfig[]>([]);
  const [customSections, setCustomSections] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    api.get("/settings/public").then(r => {
      setStudentFields(r.data.studentFormFields || []);
      setTeacherFields(r.data.teacherFormFields || []);
      setCustomSections(r.data.customSections || []);
    }).catch(() => {});
  }, []);

  const activeFields = (role === "STUDENT" ? studentFields : teacherFields).filter(f => f.enabled);
  const sections = [...new Set(activeFields.map(f => f.section || "personal"))];

  // Split into steps: step 1 = personal, step 2 = academic + parent
  const step1Sections = ["personal"];
  const step2Sections = sections.filter(s => !step1Sections.includes(s));
  const step1Fields = activeFields.filter(f => step1Sections.includes(f.section || "personal"));
  const step2Fields = activeFields.filter(f => step2Sections.includes(f.section || "personal"));

  const SECTION_LABELS: Record<string, string> = {
    personal: "Personal information",
    academic: "Academic background",
    parent: "Parent / guardian",
    custom: "Custom questions",
    ...Object.fromEntries(customSections.map(s => [s.id, s.label])),
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid email or password");
    } finally { setLoading(false); }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const knownIds = new Set(["firstName","lastName","email","phone","birthDate","address","prevSchool","prevYear","prevAverage","motivation","parentFirstName","parentLastName","parentEmail","parentPhone"]);
      const payload: Record<string, any> = { role };
      const customAnswers: Record<string, any> = {};
      for (const [k, v] of Object.entries(appValues)) {
        if (knownIds.has(k)) payload[k] = v;
        else customAnswers[k] = v;
      }
      if (payload.prevAverage) payload.prevAverage = parseFloat(payload.prevAverage as string);
      if (Object.keys(customAnswers).length) payload.customAnswers = customAnswers;
      await api.post("/applications", payload);
      setAppDone(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error submitting application");
    } finally { setLoading(false); }
  };

  const set = (id: string, v: string | string[]) => setAppValues(prev => ({ ...prev, [id]: v }));

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" }}>
      {/* Left panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 64px", color: "#fff" }} className="hide-mobile">
        <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/logo.svg" alt="SchoolMS" style={{ width: 44, height: 44, borderRadius: 10 }} />
          SchoolMS
        </div>
        <div style={{ fontSize: 18, color: "rgba(255,255,255,.7)", maxWidth: 380, lineHeight: 1.7 }}>
          A complete school management platform for students, teachers, parents and administrators.
        </div>
        <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { icon: "📊", text: "Real-time grades and bulletins" },
            { icon: "📅", text: "Timetables and homework tracking" },
            { icon: "🔔", text: "Live notifications and messaging" },
            { icon: "🔒", text: "Role-based access control" },
          ].map(f => (
            <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "rgba(255,255,255,.6)" }}>
              <span style={{ fontSize: 20 }}>{f.icon}</span>{f.text}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width: 480, background: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 40px", overflowY: "auto" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.svg" alt="SchoolMS" style={{ width: 32, height: 32, borderRadius: 7 }} />
            {tab === "login" ? "Sign in" : "Apply for admission"}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            {tab === "login" ? "Enter your credentials to access your account" : "Fill in the form and we'll review your application"}
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, background: "var(--bg)", borderRadius: 8, padding: 4 }}>
          {(["login", "apply"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "8px 0", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer",
              background: tab === t ? "#fff" : "transparent",
              color: tab === t ? "var(--primary)" : "var(--text-muted)",
              boxShadow: tab === t ? "var(--shadow)" : "none", transition: "all .15s",
            }}>
              {t === "login" ? "Sign in" : "Apply"}
            </button>
          ))}
        </div>

        {/* Login form */}
        {tab === "login" && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@school.com" required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button className="btn btn-primary w-full" style={{ justifyContent: "center", marginTop: 8, height: 42 }} disabled={loading}>
              {loading ? <div className="spinner" /> : "Sign in"}
            </button>
            <div style={{ marginTop: 24, padding: 14, background: "var(--bg)", borderRadius: 8, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text)" }}>Demo accounts</div>
              owner@flaviengibs.github.io · Owner1234!<br />
              superadmin@flaviengibs.github.io · Admin1234!<br />
              teacher@flaviengibs.github.io · Teacher1234!<br />
              student@flaviengibs.github.io · Student1234!
            </div>
          </form>
        )}

        {/* Application form */}
        {tab === "apply" && !appDone && (
          <form onSubmit={appStep === 2 || step2Fields.length === 0 ? handleApply : e => { e.preventDefault(); setAppStep(2); }}>
            {/* Step progress */}
            {step2Fields.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {[1, 2].map(s => (
                  <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: appStep >= s ? "var(--primary)" : "var(--border)", transition: "background .2s" }} />
                ))}
              </div>
            )}

            {/* Role selector — always on step 1 */}
            {appStep === 1 && (
              <div className="form-group">
                <label className="form-label">Applying as</label>
                <select value={role} onChange={e => { setRole(e.target.value); setAppValues({}); setAppStep(1); }} style={{ marginBottom: 12 }}>
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher</option>
                </select>
              </div>
            )}

            {/* Step 1 fields */}
            {appStep === 1 && step1Fields.map(f => (
              <div className="form-group" key={f.id}>
                <label className="form-label">{f.label}{f.required && <span style={{ color: "var(--danger)", marginLeft: 2 }}>*</span>}</label>
                <DynField field={f} value={appValues[f.id] || ""} onChange={v => set(f.id, v)} />
              </div>
            ))}

            {/* Step 2 fields grouped by section */}
            {appStep === 2 && step2Sections.map(section => {
              const sectionFields = step2Fields.filter(f => (f.section || "personal") === section);
              if (!sectionFields.length) return null;
              return (
                <div key={section}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--primary)", marginBottom: 10, marginTop: 4 }}>
                    {SECTION_LABELS[section] || section}
                  </div>
                  {sectionFields.map(f => (
                    <div className="form-group" key={f.id}>
                      <label className="form-label">{f.label}{f.required && <span style={{ color: "var(--danger)", marginLeft: 2 }}>*</span>}</label>
                      <DynField field={f} value={appValues[f.id] || ""} onChange={v => set(f.id, v)} />
                    </div>
                  ))}
                </div>
              );
            })}

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {appStep === 2 && (
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setAppStep(1)}>Back</button>
              )}
              <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={loading}>
                {loading ? <div className="spinner" /> : (appStep === 1 && step2Fields.length > 0) ? "Next →" : "Submit application"}
              </button>
            </div>
          </form>
        )}

        {tab === "apply" && appDone && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Application submitted</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
              We'll review your application and get back to you by email.
            </div>
            <button className="btn btn-secondary" onClick={() => { setAppDone(false); setTab("login"); setAppStep(1); setAppValues({}); }}>
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
