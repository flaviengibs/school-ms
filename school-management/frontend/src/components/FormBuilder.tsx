import { useState, useRef, useEffect } from "react";
import { Plus, Trash2, GripVertical, Eye, EyeOff, ChevronDown, ChevronUp, X, Edit2, Check } from "lucide-react";

export interface FieldConfig {
  id: string; label: string;
  type: "text" | "textarea" | "email" | "tel" | "date" | "number" | "radio" | "checkbox" | "select" | "yesno" | "scale" | "file" | "other";
  required: boolean; enabled: boolean; placeholder?: string; section?: string;
  options?: string[]; scaleMin?: number; scaleMax?: number; scaleMinLabel?: string; scaleMaxLabel?: string;
  custom?: boolean;
}

export interface SectionConfig { id: string; label: string; deletable?: boolean }

const DEFAULT_SECTIONS: SectionConfig[] = [
  { id: "personal", label: "Personal information" },
  { id: "academic", label: "Academic background" },
  { id: "parent",   label: "Parent / guardian" },
  { id: "custom",   label: "Custom questions" },
];

const TYPE_META: Record<string, { label: string; icon: string; desc: string }> = {
  text:     { label: "Short text",      icon: "✏️", desc: "Single line" },
  textarea: { label: "Long text",       icon: "📝", desc: "Multi-line" },
  email:    { label: "Email",           icon: "📧", desc: "Email address" },
  tel:      { label: "Phone",           icon: "📞", desc: "Phone number" },
  date:     { label: "Date",            icon: "📅", desc: "Date picker" },
  number:   { label: "Number",          icon: "🔢", desc: "Numeric value" },
  radio:    { label: "Single choice",   icon: "🔘", desc: "Radio buttons" },
  checkbox: { label: "Multiple choice", icon: "☑️", desc: "Checkboxes" },
  select:   { label: "Dropdown",        icon: "▼",  desc: "Select list" },
  yesno:    { label: "Yes / No",        icon: "✅", desc: "Binary choice" },
  scale:    { label: "Scale",           icon: "📊", desc: "Numeric slider" },
  file:     { label: "File upload",     icon: "📎", desc: "Document/image" },
  other:    { label: "Choice + other",  icon: "💬", desc: "Options + free text" },
};

function OptionEditor({ options = [], onChange }: { options: string[]; onChange: (o: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => { if (draft.trim()) { onChange([...options, draft.trim()]); setDraft(""); } };
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Options</div>
      {options.map((o, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
          <input value={o} onChange={e => { const n = [...options]; n[i] = e.target.value; onChange(n); }} style={{ fontSize: 12, padding: "4px 8px" }} />
          <button type="button" onClick={() => onChange(options.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}><X size={12} /></button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())} placeholder="Add option..." style={{ fontSize: 12, padding: "4px 8px", flex: 1 }} />
        <button type="button" className="btn btn-sm btn-secondary" onClick={add}>Add</button>
      </div>
    </div>
  );
}

function FieldRow({
  field, sections, onChange, onDelete, onDragStart, onDragOver, onDrop, isDragging,
}: {
  field: FieldConfig; sections: SectionConfig[];
  onChange: (f: FieldConfig) => void; onDelete?: () => void;
  onDragStart: () => void; onDragOver: (e: React.DragEvent) => void; onDrop: () => void;
  isDragging: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[field.type];
  const hasOptions = ["radio", "checkbox", "select", "other"].includes(field.type);
  const hasScale = field.type === "scale";
  const hasMinMax = field.type === "number";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver(e); }}
      onDrop={e => { e.preventDefault(); onDrop(); }}
      style={{
        border: `1px solid ${isDragging ? "var(--primary)" : "var(--border)"}`,
        borderRadius: 8, marginBottom: 6, overflow: "hidden",
        opacity: isDragging ? 0.4 : field.enabled ? 1 : 0.55,
        background: field.custom ? "var(--primary-light)" : "var(--surface)",
        cursor: "grab",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px" }}>
        <GripVertical size={13} color="var(--text-muted)" style={{ flexShrink: 0, cursor: "grab" }} />
        <span style={{ fontSize: 15, flexShrink: 0 }}>{meta?.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input value={field.label} onChange={e => onChange({ ...field, label: e.target.value })}
            style={{ border: "none", background: "transparent", fontWeight: 500, fontSize: 13, padding: 0, width: "100%" }} />
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{meta?.label}{field.custom ? " · custom" : ""}</div>
        </div>

        {/* Section selector */}
        <select
          value={field.section || "personal"}
          onChange={e => onChange({ ...field, section: e.target.value })}
          style={{ fontSize: 11, padding: "2px 4px", width: "auto", border: "1px solid var(--border)", borderRadius: 4 }}
          onClick={e => e.stopPropagation()}
        >
          {sections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>

        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer", flexShrink: 0 }}>
          <input type="checkbox" checked={field.required} onChange={e => onChange({ ...field, required: e.target.checked })} style={{ width: "auto" }} disabled={!field.enabled} />
          Req.
        </label>
        {(hasOptions || hasScale || hasMinMax) && (
          <button type="button" onClick={() => setExpanded(x => !x)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
        <button type="button" onClick={() => onChange({ ...field, enabled: !field.enabled })} style={{ background: "none", border: "none", cursor: "pointer", color: field.enabled ? "var(--primary)" : "var(--text-muted)", padding: 2 }}>
          {field.enabled ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
        {field.custom && onDelete && (
          <button type="button" onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 2 }}>
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {expanded && (
        <div style={{ padding: "0 12px 12px", borderTop: "1px solid var(--border)" }}>
          {hasMinMax && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Min</span>
                <input type="number" value={field.scaleMin ?? ""} onChange={e => onChange({ ...field, scaleMin: e.target.value ? parseInt(e.target.value) : undefined })} style={{ width: 70, fontSize: 12, padding: "4px 6px" }} placeholder="—" />
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Max</span>
                <input type="number" value={field.scaleMax ?? ""} onChange={e => onChange({ ...field, scaleMax: e.target.value ? parseInt(e.target.value) : undefined })} style={{ width: 70, fontSize: 12, padding: "4px 6px" }} placeholder="—" />
              </div>
            </div>
          )}
          {hasScale && (
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Min</span>
                <input type="number" value={field.scaleMin ?? 1} onChange={e => onChange({ ...field, scaleMin: parseInt(e.target.value) })} style={{ width: 52, fontSize: 12, padding: "4px 6px" }} />
                <input value={field.scaleMinLabel ?? ""} onChange={e => onChange({ ...field, scaleMinLabel: e.target.value })} placeholder="Label" style={{ fontSize: 12, padding: "4px 8px", width: 120 }} />
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Max</span>
                <input type="number" value={field.scaleMax ?? 10} onChange={e => onChange({ ...field, scaleMax: parseInt(e.target.value) })} style={{ width: 52, fontSize: 12, padding: "4px 6px" }} />
                <input value={field.scaleMaxLabel ?? ""} onChange={e => onChange({ ...field, scaleMaxLabel: e.target.value })} placeholder="Label" style={{ fontSize: 12, padding: "4px 8px", width: 120 }} />
              </div>
            </div>
          )}
          {hasOptions && <OptionEditor options={field.options || []} onChange={opts => onChange({ ...field, options: opts })} />}
        </div>
      )}
    </div>
  );
}

function AddQuestionModal({ sections, onAdd, onClose }: { sections: SectionConfig[]; onAdd: (f: FieldConfig) => void; onClose: () => void }) {
  const [type, setType] = useState<FieldConfig["type"]>("text");
  const [label, setLabel] = useState("");
  const [required, setRequired] = useState(false);
  const [section, setSection] = useState(sections[sections.length - 1]?.id || "custom");

  const handleAdd = () => {
    if (!label.trim()) return;
    onAdd({
      id: `custom_${Date.now()}`, label: label.trim(), type, required, enabled: true,
      section, custom: true,
      options: ["radio", "checkbox", "select", "other"].includes(type) ? [] : undefined,
      scaleMin: type === "scale" ? 1 : undefined,
      scaleMax: type === "scale" ? 10 : undefined,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Add a custom question</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Question type</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {(Object.keys(TYPE_META) as FieldConfig["type"][]).map(t => {
                const m = TYPE_META[t];
                return (
                  <label key={t} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                    border: `2px solid ${type === t ? "var(--primary)" : "var(--border)"}`,
                    borderRadius: 8, cursor: "pointer", fontSize: 12,
                    background: type === t ? "var(--primary-light)" : "transparent",
                  }}>
                    <input type="radio" name="qtype" value={t} checked={type === t} onChange={() => setType(t)} style={{ width: "auto" }} />
                    <span style={{ fontSize: 15 }}>{m.icon}</span>
                    <div><div style={{ fontWeight: 600 }}>{m.label}</div><div style={{ color: "var(--text-muted)", fontSize: 10 }}>{m.desc}</div></div>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Question label</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. How did you hear about us?" autoFocus />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Section</label>
              <select value={section} onChange={e => setSection(e.target.value)}>
                {sections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ display: "flex", alignItems: "flex-end" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", paddingBottom: 8 }}>
                <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} style={{ width: "auto" }} />
                Required
              </label>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleAdd} disabled={!label.trim()}>
              <Plus size={13} /> Add question
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ section, onRename, onDelete }: { section: SectionConfig; onRename: (label: string) => void; onDelete?: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(section.label);

  // Keep draft in sync if the label changes externally
  useEffect(() => { setDraft(section.label); }, [section.label]);

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== section.label) onRename(trimmed);
    setEditing(false);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, marginTop: 4 }}>
      {editing ? (
        <>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
            style={{ fontSize: 11, fontWeight: 600, padding: "2px 6px", flex: 1 }}
            autoFocus
          />
          <button type="button" onClick={save} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--success)" }}>
            <Check size={12} />
          </button>
          <button type="button" onClick={() => setEditing(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
            <X size={12} />
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted)", flex: 1 }}>
            {section.label}
          </div>
          <button type="button" onClick={() => setEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }}>
            <Edit2 size={11} />
          </button>
          {section.deletable && onDelete && (
            <button type="button" onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 2 }}>
              <Trash2 size={11} />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function FormFieldEditor({
  fields, onChange, customSections = [], onSectionsChange, title,
}: {
  fields: FieldConfig[]; onChange: (f: FieldConfig[]) => void;
  customSections?: SectionConfig[]; onSectionsChange?: (s: SectionConfig[]) => void;
  title: string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionLabel, setNewSectionLabel] = useState("");
  const dragField = useRef<string | null>(null);
  const dragOver = useRef<string | null>(null);

  // Merge built-in sections with any overrides/additions from customSections
  const customById = Object.fromEntries(customSections.map(s => [s.id, s]));
  const allSections: SectionConfig[] = [
    // Built-in sections, with label overrides applied
    ...DEFAULT_SECTIONS.map(s => customById[s.id] ? { ...s, label: customById[s.id].label } : s),
    // Truly new custom sections (ids not in DEFAULT_SECTIONS)
    ...customSections.filter(s => !DEFAULT_SECTIONS.some(d => d.id === s.id)).map(s => ({ ...s, deletable: true })),
  ];

  const handleDragStart = (id: string) => { dragField.current = id; };
  const handleDragOver = (id: string) => { dragOver.current = id; };
  const handleDrop = () => {
    if (!dragField.current || !dragOver.current || dragField.current === dragOver.current) return;
    const from = fields.findIndex(f => f.id === dragField.current);
    const to = fields.findIndex(f => f.id === dragOver.current);
    if (from === -1 || to === -1) return;
    const next = [...fields];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
    dragField.current = null;
    dragOver.current = null;
  };

  const handleChange = (updated: FieldConfig) => onChange(fields.map(f => f.id === updated.id ? updated : f));
  const handleDelete = (id: string) => onChange(fields.filter(f => f.id !== id));

  const addSection = () => {
    if (!newSectionLabel.trim()) return;
    const id = `section_${Date.now()}`;
    onSectionsChange?.([...customSections, { id, label: newSectionLabel.trim(), deletable: true }]);
    setNewSectionLabel("");
    setShowAddSection(false);
  };

  const renameSection = (id: string, label: string) => {
    const alreadyInCustom = customSections.some(s => s.id === id);
    if (alreadyInCustom) {
      // Update existing entry
      onSectionsChange?.(customSections.map(s => s.id === id ? { ...s, label } : s));
    } else {
      // Built-in section — add an override entry with the same id
      onSectionsChange?.([...customSections, { id, label, deletable: false }]);
    }
  };

  const deleteSection = (id: string) => {
    // Move fields from deleted section to "custom"
    onChange(fields.map(f => f.section === id ? { ...f, section: "custom" } : f));
    onSectionsChange?.(customSections.filter(s => s.id !== id));
  };

  return (
    <div>
      {title && <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>{title}</div>}

      {allSections.map(section => {
        const sectionFields = fields.filter(f => (f.section || "personal") === section.id);
        return (
          <div key={section.id} style={{ marginBottom: 16 }}>
            <SectionHeader
              section={section}
              onRename={label => {
                if (section.deletable) renameSection(section.id, label);
                // Built-in sections: just update display label in fields? No — keep id stable
              }}
              onDelete={section.deletable ? () => deleteSection(section.id) : undefined}
            />
            {sectionFields.length === 0 && (
              <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", border: "1px dashed var(--border)", borderRadius: 8 }}>
                No fields — drag one here or add a question
              </div>
            )}
            {sectionFields.map(field => (
              <FieldRow
                key={field.id}
                field={field}
                sections={allSections}
                onChange={handleChange}
                onDelete={field.custom ? () => handleDelete(field.id) : undefined}
                onDragStart={() => handleDragStart(field.id)}
                onDragOver={() => handleDragOver(field.id)}
                onDrop={handleDrop}
                isDragging={dragField.current === field.id}
              />
            ))}
          </div>
        );
      })}

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="button" className="btn btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowAdd(true)}>
          <Plus size={13} /> Add a question
        </button>
        {onSectionsChange && (
          <button type="button" className="btn btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowAddSection(true)}>
            <Plus size={13} /> Add a section
          </button>
        )}
      </div>

      {showAddSection && (
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <input value={newSectionLabel} onChange={e => setNewSectionLabel(e.target.value)} placeholder="Section name..." onKeyDown={e => e.key === "Enter" && addSection()} autoFocus style={{ flex: 1 }} />
          <button type="button" className="btn btn-primary btn-sm" onClick={addSection}>Create</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddSection(false)}>Cancel</button>
        </div>
      )}

      {showAdd && <AddQuestionModal sections={allSections} onAdd={f => { onChange([...fields, f]); }} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
