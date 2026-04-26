export interface FieldConfig {
  id: string;
  label: string;
  // Built-in types (always present, cannot be deleted)
  // Custom types (added by super admin)
  type:
    | "text"        // short text
    | "textarea"    // long text
    | "email"
    | "tel"
    | "date"
    | "number"
    | "radio"       // single choice
    | "checkbox"    // multiple choice
    | "select"      // dropdown
    | "yesno"       // yes / no
    | "scale"       // numeric scale 1–N
    | "file"        // file upload
    | "other";      // choice + free text "other"
  required: boolean;
  enabled: boolean;
  placeholder?: string;
  section?: "personal" | "academic" | "parent" | "custom";
  // For radio / checkbox / select / other
  options?: string[];
  // For scale
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  // Whether this field was added by the super admin (can be deleted)
  custom?: boolean;
}

export const DEFAULT_STUDENT_FIELDS: FieldConfig[] = [
  { id: "firstName",       label: "First name",              type: "text",     required: true,  enabled: true,  section: "personal" },
  { id: "lastName",        label: "Last name",               type: "text",     required: true,  enabled: true,  section: "personal" },
  { id: "email",           label: "Email",                   type: "email",    required: true,  enabled: true,  section: "personal" },
  { id: "phone",           label: "Phone",                   type: "tel",      required: false, enabled: true,  section: "personal" },
  { id: "birthDate",       label: "Date of birth",           type: "date",     required: false, enabled: true,  section: "personal" },
  { id: "address",         label: "Address",                 type: "text",     required: false, enabled: false, section: "personal" },
  { id: "prevSchool",      label: "Previous school",         type: "text",     required: false, enabled: true,  section: "academic" },
  { id: "prevYear",        label: "School year",             type: "text",     required: false, enabled: true,  section: "academic", placeholder: "e.g. 2024-2025" },
  { id: "prevAverage",     label: "Previous average (/20)",  type: "number",   required: false, enabled: true,  section: "academic" },
  { id: "motivation",      label: "Motivation letter",       type: "textarea", required: false, enabled: true,  section: "academic" },
  { id: "parentFirstName", label: "Parent first name",       type: "text",     required: false, enabled: true,  section: "parent" },
  { id: "parentLastName",  label: "Parent last name",        type: "text",     required: false, enabled: true,  section: "parent" },
  { id: "parentEmail",     label: "Parent email",            type: "email",    required: false, enabled: true,  section: "parent" },
  { id: "parentPhone",     label: "Parent phone",            type: "tel",      required: false, enabled: true,  section: "parent" },
];

export const DEFAULT_TEACHER_FIELDS: FieldConfig[] = [
  { id: "firstName",   label: "First name",          type: "text",     required: true,  enabled: true,  section: "personal" },
  { id: "lastName",    label: "Last name",            type: "text",     required: true,  enabled: true,  section: "personal" },
  { id: "email",       label: "Email",                type: "email",    required: true,  enabled: true,  section: "personal" },
  { id: "phone",       label: "Phone",                type: "tel",      required: false, enabled: true,  section: "personal" },
  { id: "birthDate",   label: "Date of birth",        type: "date",     required: false, enabled: false, section: "personal" },
  { id: "address",     label: "Address",              type: "text",     required: false, enabled: false, section: "personal" },
  { id: "prevSchool",  label: "Previous institution", type: "text",     required: false, enabled: true,  section: "academic" },
  { id: "motivation",  label: "Cover letter",         type: "textarea", required: false, enabled: true,  section: "academic" },
];
