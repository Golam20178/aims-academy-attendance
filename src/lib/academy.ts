import { z } from "zod";
export const levels = [
  "Level 3: OTHM Level 3 Foundation Diploma in Higher Education Studies (HES)",
  "Level 3: OTHM Level 3 Foundation Diploma in Information Technology",
  "Level 3: OTHM Level 3 Foundation Diploma in Business Management",
  "Level 5: OTHM Level 5 Extended Diploma in Information Technology",
  "Level 5: OTHM Level 5 Extended Diploma in Business Management",
  "Level 5: OTHM Level 5 Diploma in Tourism and Hospitality Management",
  "Level 5: OTHM Level 5 Diploma in Logistics and Supply Chain Management",
] as const;
export const teacherLevels = [
  "IT Lecturer",
  "BM Lecturer",
  "THM Lecturer",
] as const;
const legacyLevels = ["Level 1", "Level 2", "Level 3", "Level 4"] as const;
export const personSchema = z.object({
  id: z.string(),
  code: z.string().trim().min(1, "ID is required"),
  name: z.string().trim().min(2, "Enter a full name"),
  email: z.union([z.literal(""), z.email("Enter a valid email")]),
  phone: z.string().trim(),
  // Empty represents an existing person whose old level needs reassignment.
  level: z.union([z.enum(levels), z.enum(teacherLevels), z.literal("")]),
  enrolled: z.iso.date(),
  status: z.enum(["Active", "Inactive"]),
  notes: z.string(),
});
export type Person = z.infer<typeof personSchema>;
export const recordSchema = z.object({
  personId: z.string(),
  kind: z.enum(["students", "teachers"]),
  date: z.iso.date(),
  status: z.enum(["Present", "Absent"]),
});
export type Attendance = z.infer<typeof recordSchema>;
export const databaseSchema = z.object({
  version: z.literal(3),
  students: z.array(personSchema),
  teachers: z.array(personSchema),
  attendance: z.array(recordSchema),
});
export type Database = z.infer<typeof databaseSchema>;
export type Kind = "students" | "teachers";
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function summary(records: Attendance[]) {
  const present = records.filter((r) => r.status === "Present").length;
  return {
    present,
    absent: records.length - present,
    total: records.length,
    rate: records.length ? Math.round((present / records.length) * 100) : null,
  };
}
export function upsertAttendance(
  db: Database,
  kind: Kind,
  date: string,
  changes: Record<string, "Present" | "Absent">,
): Database {
  const ids = new Set(db[kind].map((p) => p.id));
  const next = db.attendance.filter(
    (r) => !(r.kind === kind && r.date === date && changes[r.personId]),
  );
  Object.entries(changes).forEach(([personId, status]) => {
    if (ids.has(personId)) next.push({ personId, kind, date, status });
  });
  return { ...db, attendance: next };
}
export function removePerson(db: Database, kind: Kind, id: string): Database {
  return {
    ...db,
    [kind]: db[kind].filter((p) => p.id !== id),
    attendance: db.attendance.filter(
      (r) => !(r.kind === kind && r.personId === id),
    ),
  };
}
export function emptyDatabase(): Database {
  return { version: 3, students: [], teachers: [], attendance: [] };
}

const legacyPersonSchema = personSchema.extend({
  level: z.union([
    z.enum(levels),
    z.enum(teacherLevels),
    z.enum(legacyLevels),
    z.literal(""),
  ]),
});
const legacyDatabaseSchema = databaseSchema.extend({
  version: z.union([z.literal(1), z.literal(2)]),
  students: z.array(legacyPersonSchema),
  teachers: z.array(legacyPersonSchema),
});
// Fingerprints identify only the original samples. User-created records are preserved.
const sampleStudents = [
  "Ayesha Rahman",
  "Samiul Islam",
  "Nusrat Jahan",
  "Arif Hasan",
  "Fatima Akter",
  "Rafi Ahmed",
  "Mariam Khan",
  "Tanvir Hossain",
  "Sumaiya Noor",
  "Imran Kabir",
  "Tasnim Sultana",
  "Nabil Chowdhury",
];
const sampleTeachers = [
  "Sarah Ahmed",
  "Mahmud Hasan",
  "Farhana Islam",
  "Rezaul Karim",
];
export function migrateDatabase(input: unknown): Database {
  const current = databaseSchema.safeParse(input);
  if (current.success) return current.data;
  const old = legacyDatabaseSchema.parse(input);
  const isSample = (p: z.infer<typeof legacyPersonSchema>, kind: Kind) => {
    const names = kind === "students" ? sampleStudents : sampleTeachers;
    return names.some(
      (name, i) =>
        p.id === `${kind === "students" ? "s" : "t"}${i + 1}` &&
        p.code ===
          `${kind === "students" ? "AIMS" : "T"}-${String(i + 1).padStart(3, "0")}` &&
        p.name === name,
    );
  };
  const students = old.students
    .filter((p) => old.version !== 1 || !isSample(p, "students"))
    .map((p) => ({
      ...p,
      level: (levels as readonly string[]).includes(p.level)
        ? p.level
        : ("" as const),
    }));
  const teachers = old.teachers
    .filter((p) => old.version !== 1 || !isSample(p, "teachers"))
    .map((p) => ({
      ...p,
      level: (teacherLevels as readonly string[]).includes(p.level)
        ? p.level
        : ("" as const),
    }));
  const studentIds = new Set(students.map((p) => p.id));
  const teacherIds = new Set(teachers.map((p) => p.id));
  const attendance = old.attendance.filter((r) =>
    (r.kind === "students" ? studentIds : teacherIds).has(r.personId),
  );
  return databaseSchema.parse({ version: 3, students, teachers, attendance });
}
export function studentAttendanceForLevel(
  db: Database,
  level: string,
): Attendance[] {
  const ids = new Set(
    db.students.filter((p) => p.level === level).map((p) => p.id),
  );
  return db.attendance.filter(
    (r) => r.kind === "students" && ids.has(r.personId),
  );
}
export function exportCsv(rows: string[][], filename: string) {
  const csv = rows
    .map((row) =>
      row
        .map(
          (v) =>
            '"' +
            (/^[=+@-]/.test(v) ? "'" : "") +
            v.replaceAll('"', '""') +
            '"',
        )
        .join(","),
    )
    .join("\r\n");
  download(
    new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
    filename,
  );
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
