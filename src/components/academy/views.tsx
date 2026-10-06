"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Users,
  GraduationCap,
  CalendarCheck,
  TrendingUp,
  Plus,
  Search,
  Pencil,
  Trash2,
  Download,
  ArrowLeft,
  Check,
  Save,
  Upload,
  Database as DatabaseIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Database,
  Kind,
  Person,
  Attendance,
  levels,
  teacherLevels,
  migrateDatabase,
  studentAttendanceForLevel,
  today,
  summary,
  personSchema,
  upsertAttendance,
  removePerson,
  exportCsv,
  download,
} from "@/lib/academy";
import { saveDatabase, restoreDatabase } from "@/lib/local-store";
import {
  Heading,
  Stat,
  Choice,
  Status,
  Empty,
  AttendanceChart,
} from "./shared";

export function Dashboard({ db }: { db: Database }) {
  const [chartLevel, setChartLevel] = useState<string>(levels[0]);
  const chartRecords = studentAttendanceForLevel(db, chartLevel);
  const date = today();
  const records = db.attendance.filter((r) => r.kind === "students");
  const current = records.filter((r) => r.date === date);
  const s = summary(current);
  const active = db.students.filter((p) => p.status === "Active");
  const low = db.students
    .map((p) => ({ p, s: summary(records.filter((r) => r.personId === p.id)) }))
    .filter((x) => x.s.rate !== null && x.s.rate < 75);
  return (
    <>
      <Heading
        title="Academy overview"
        description={`A clear picture of your academy · ${date}`}
      >
        <Button nativeButton={false} render={<Link href="/attendance" />}>
          <CalendarCheck />
          Take attendance
        </Button>
      </Heading>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Active students"
          value={active.length}
          detail={`${db.students.length} total enrolled`}
          icon={<GraduationCap className="size-5" />}
        />
        <Stat
          label="Teachers"
          value={db.teachers.filter((p) => p.status === "Active").length}
          detail="Active teaching team"
          icon={<Users className="size-5" />}
        />
        <Stat
          label="Present today"
          value={s.present}
          detail={`${current.length} student records saved`}
          icon={<CalendarCheck className="size-5" />}
        />
        <Stat
          label="Today's attendance"
          value={s.rate === null ? "—" : `${s.rate}%`}
          detail={`${active.filter((p) => !current.some((r) => r.personId === p.id)).length} active students unmarked`}
          icon={<TrendingUp className="size-5" />}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Attendance at a glance</CardTitle>
            <CardDescription>
              Attendance for the selected student programme · Latest 12 recorded
              dates
            </CardDescription>
            <div className="mt-3 space-y-2">
              <Label>Student level / programme</Label>
              <Choice
                label="Overview student level"
                value={chartLevel}
                onChange={setChartLevel}
                items={[...levels]}
              />
            </div>
          </CardHeader>
          <CardContent>
            <AttendanceChart records={chartRecords} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Students by level</CardTitle>
            <CardDescription>
              Active enrollment across your academy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {levels.map((l) => {
              const count = active.filter((p) => p.level === l).length;
              return (
                <div key={l}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>{l}</span>
                    <span className="font-medium">{count} students</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${active.length ? (count / active.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance follow-up</CardTitle>
            <CardDescription>
              Students below 75% attendance across saved records
            </CardDescription>
          </CardHeader>
          <CardContent>
            {low.length ? (
              <div className="space-y-4">
                {low.map(({ p, s }) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <Link
                      className="font-medium text-primary hover:underline"
                      href={`/students/${p.id}`}
                    >
                      {p.name}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {p.code} · {p.level}
                      </span>
                    </Link>
                    <span className="text-sm font-semibold text-destructive">
                      {s.rate}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="No students currently need attendance follow-up." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent enrollment</CardTitle>
            <CardDescription>Your latest student registrations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...db.students]
              .sort((a, b) => b.enrolled.localeCompare(a.enrolled))
              .slice(0, 5)
              .map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <Link
                    className="text-sm font-medium hover:text-primary"
                    href={`/students/${p.id}`}
                  >
                    {p.name}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {p.code} · {p.enrolled}
                    </span>
                  </Link>
                  <Status value={p.level} />
                </div>
              ))}
            {!db.students.length && (
              <Empty text="Add your first student to get started." />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function People({ kind, db }: { kind: Kind; db: Database }) {
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("All levels");
  const [status, setStatus] = useState("All statuses");
  const [editing, setEditing] = useState<Person | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Person | null>(null);
  const [page, setPage] = useState(0);
  const noun = kind === "students" ? "student" : "teacher";
  const rows = db[kind].filter(
    (p) =>
      `${p.name} ${p.code} ${p.email} ${p.phone}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (level === "All levels" || p.level === level) &&
      (status === "All statuses" || p.status === status),
  );
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const current = Math.min(page, pages - 1);
  return (
    <>
      <Heading
        title={kind === "students" ? "Students" : "Teachers"}
        description={`Manage your ${noun} records, levels, and contact details.`}
      >
        <Button
          variant="outline"
          onClick={() =>
            exportCsv(
              [
                ["ID", "Name", "Email", "Phone", "Level", "Joined", "Status"],
                ...rows.map((p) => [
                  p.code,
                  p.name,
                  p.email,
                  p.phone,
                  p.level,
                  p.enrolled,
                  p.status,
                ]),
              ],
              `${kind}.csv`,
            )
          }
        >
          <Download />
          Export
        </Button>
        <Button onClick={() => setEditing(null)}>
          <Plus />
          Add {noun}
        </Button>
      </Heading>
      <Card>
        <CardHeader>
          <CardTitle>
            {db[kind].length} {kind}
          </CardTitle>
          <div className="flex flex-wrap gap-3 pt-3">
            <div className="relative min-w-48 flex-1">
              <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
              <Input
                aria-label={`Search ${kind}`}
                placeholder={`Search ${kind} by name, ID, or contact…`}
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <div className="w-40">
              <Choice
                label="Filter level"
                value={level}
                onChange={(v) => {
                  setLevel(v);
                  setPage(0);
                }}
                items={[
                  "All levels",
                  ...(kind === "students" ? levels : teacherLevels),
                ]}
              />
            </div>
            <div className="w-40">
              <Choice
                label="Filter status"
                value={status}
                onChange={(v) => {
                  setStatus(v);
                  setPage(0);
                }}
                items={["All statuses", "Active", "Inactive"]}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {noun === "student" ? "Student" : "Teacher"}
                </TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(current * 10, current * 10 + 10).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {kind === "students" ? (
                      <Link
                        className="font-medium text-primary hover:underline"
                        href={`/students/${p.id}`}
                      >
                        {p.name}
                      </Link>
                    ) : (
                      <span className="font-medium">{p.name}</span>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {p.code}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-sm whitespace-normal">
                    {p.level ||
                      (kind === "teachers"
                        ? "Lecturer role not assigned"
                        : "Programme not assigned")}
                  </TableCell>
                  <TableCell>
                    <div>{p.email || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.phone}
                    </div>
                  </TableCell>
                  <TableCell>{p.enrolled}</TableCell>
                  <TableCell>
                    <Status value={p.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${p.name}`}
                        onClick={() => setEditing(p)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${p.name}`}
                        onClick={() => setDeleting(p)}
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!rows.length && (
            <Empty text="No matching records. Add a record or adjust your filters." />
          )}
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {rows.length} results · Page {current + 1} of {pages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={current === pages - 1}
                onClick={() => setPage(current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {editing !== undefined && (
        <PersonEditor
          db={db}
          kind={kind}
          person={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
      <DeleteDialog
        person={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting && saveDatabase(removePerson(db, kind, deleting.id))) {
            toast.success(`${noun} deleted`);
            setDeleting(null);
          }
        }}
      />
    </>
  );
}
function PersonEditor({
  db,
  kind,
  person,
  onClose,
}: {
  db: Database;
  kind: Kind;
  person: Person | null;
  onClose: () => void;
}) {
  const [level, setLevel] = useState<Person["level"]>(
    person?.level ?? (kind === "students" ? levels[0] : teacherLevels[0]),
  );
  const [status, setStatus] = useState(person?.status ?? "Active");
  const [error, setError] = useState("");
  const noun = kind === "students" ? "student" : "teacher";
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (kind === "students" && !(levels as readonly string[]).includes(level)) {
      setError("Choose an OTHM programme for this student.");
      return;
    }
    if (
      kind === "teachers" &&
      !(teacherLevels as readonly string[]).includes(level)
    ) {
      setError("Choose a lecturer role for this teacher.");
      return;
    }
    const f = new FormData(e.currentTarget);
    const parsed = personSchema.safeParse({
      ...Object.fromEntries(f),
      id: person?.id ?? crypto.randomUUID(),
      level,
      status,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (
      db[kind].some(
        (p) =>
          p.id !== parsed.data.id &&
          p.code.toLowerCase() === parsed.data.code.toLowerCase(),
      )
    ) {
      setError("This ID is already in use. Choose a unique ID.");
      return;
    }
    const people = person
      ? db[kind].map((p) => (p.id === person.id ? parsed.data : p))
      : [...db[kind], parsed.data];
    if (saveDatabase({ ...db, [kind]: people })) {
      toast.success(`${noun} ${person ? "updated" : "added"}`);
      onClose();
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {person ? "Edit" : "Add"} {noun}
          </DialogTitle>
          <DialogDescription>
            Keep academy records accurate. Fields marked * are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["name", "Full name *", "text", person?.name ?? ""],
              [
                "code",
                `${noun === "student" ? "Student" : "Teacher"} ID *`,
                "text",
                person?.code ?? "",
              ],
              ["email", "Email", "email", person?.email ?? ""],
              ["phone", "Phone", "tel", person?.phone ?? ""],
              [
                "enrolled",
                "Joining date *",
                "date",
                person?.enrolled ?? today(),
              ],
            ].map(([name, label, type, value]) => (
              <div className="space-y-2" key={name}>
                <Label htmlFor={`person-${name}`}>{label}</Label>
                <Input
                  id={`person-${name}`}
                  name={name}
                  type={type}
                  defaultValue={value}
                  required={["name", "code", "enrolled"].includes(name)}
                  max={name === "enrolled" ? today() : undefined}
                />
              </div>
            ))}
            <div
              className={
                kind === "students" ? "space-y-2 sm:col-span-2" : "space-y-2"
              }
            >
              <Label>
                {kind === "students"
                  ? "Student level / programme *"
                  : "Lecturer role *"}
              </Label>
              <Choice
                label={kind === "students" ? "Level" : "Lecturer role"}
                value={level}
                onChange={(v) => setLevel(v as Person["level"])}
                items={[...(kind === "students" ? levels : teacherLevels)]}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Choice
                label="Status"
                value={status}
                onChange={(v) => setStatus(v as Person["status"])}
                items={["Active", "Inactive"]}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="person-notes">Notes</Label>
            <Textarea
              id="person-notes"
              name="notes"
              defaultValue={person?.notes ?? ""}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              <Save />
              Save {noun}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function DeleteDialog({
  person,
  onClose,
  onConfirm,
}: {
  person: Person | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={!!person} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {person?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the person and all their attendance records from this
            browser. Export a backup first if you need to keep them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete record
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AttendancePage({ db }: { db: Database }) {
  const [kind, setKind] = useState<Kind>("students");
  const [date, setDate] = useState(today());
  const [level, setLevel] = useState("All levels");
  return (
    <>
      <Heading
        title="Attendance"
        description="Mark present or absent, then save the sheet. Existing records can be corrected."
      />
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-5">
          <div className="w-40 space-y-2">
            <Label>Attendance for</Label>
            <Choice
              value={kind}
              onChange={(v) => setKind(v as Kind)}
              items={["students", "teachers"]}
              label="Attendance for"
            />
          </div>
          <div className="w-44 space-y-2">
            <Label htmlFor="attendance-date">Date</Label>
            <Input
              id="attendance-date"
              type="date"
              value={date}
              max={today()}
              onInput={(e) => {
                if (e.currentTarget.value) setDate(e.currentTarget.value);
              }}
            />
          </div>
          <div className="w-44 space-y-2">
            <Label>Level</Label>
            <Choice
              value={level}
              onChange={setLevel}
              items={[
                "All levels",
                ...(kind === "students" ? levels : teacherLevels),
              ]}
              label="Attendance level"
            />
          </div>
        </CardContent>
      </Card>
      <AttendanceSheet
        key={`${kind}:${date}:${level}`}
        db={db}
        kind={kind}
        date={date}
        level={level}
      />
    </>
  );
}
function AttendanceSheet({
  db,
  kind,
  date,
  level,
}: {
  db: Database;
  kind: Kind;
  date: string;
  level: string;
}) {
  const [draft, setDraft] = useState<Record<string, "Present" | "Absent">>({});
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<Attendance | null>(null);
  const eligible = db[kind].filter(
    (p) =>
      (level === "All levels" || p.level === level) &&
      p.enrolled <= date &&
      (p.status === "Active" ||
        db.attendance.some(
          (r) => r.personId === p.id && r.kind === kind && r.date === date,
        )),
  );
  const people = eligible.filter((p) =>
    `${p.name} ${p.code}`.toLowerCase().includes(search.toLowerCase()),
  );
  const saved = db.attendance.filter((r) => r.kind === kind && r.date === date);
  const get = (id: string) =>
    draft[id] ?? saved.find((r) => r.personId === id)?.status;
  const marked = eligible.filter((p) => get(p.id));
  const present = marked.filter((p) => get(p.id) === "Present").length;
  const future = date > today();
  function save() {
    if (future) {
      toast.error("Future attendance cannot be saved.");
      return;
    }
    if (!Object.keys(draft).length) {
      toast.info("Choose attendance statuses before saving.");
      return;
    }
    if (saveDatabase(upsertAttendance(db, kind, date, draft))) {
      setDraft({});
      toast.success("Attendance saved");
    }
  }
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Present"
          value={present}
          detail="In this sheet, including unsaved changes"
          icon={<Check className="size-5" />}
        />
        <Stat
          label="Absent"
          value={marked.length - present}
          detail="Explicitly marked absent"
          icon={<Users className="size-5" />}
        />
        <Stat
          label="Unmarked"
          value={eligible.length - marked.length}
          detail="Unmarked people are not counted as absent"
          icon={<CalendarCheck className="size-5" />}
        />
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <CardTitle>
                {kind === "students" ? "Student" : "Teacher"} attendance sheet
              </CardTitle>
              <CardDescription>
                {date} · {eligible.length} eligible people ·{" "}
                {Object.keys(draft).length} unsaved changes
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={!people.length || future}
                onClick={() =>
                  setDraft({
                    ...draft,
                    ...Object.fromEntries(
                      people.map((p) => [p.id, "Present" as const]),
                    ),
                  })
                }
              >
                <Check />
                Mark visible present
              </Button>
              <Button
                disabled={future || !Object.keys(draft).length}
                onClick={save}
              >
                <Save />
                Save attendance
              </Button>
            </div>
          </div>
          <Input
            aria-label="Search attendance sheet"
            placeholder="Search by name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-3 max-w-sm"
          />
        </CardHeader>
        <CardContent>
          {future && (
            <Alert variant="destructive">
              <AlertTitle>Choose today or an earlier date</AlertTitle>
              <AlertDescription>
                Attendance cannot be recorded in advance.
              </AlertDescription>
            </Alert>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead className="text-right">Saved record</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((p) => {
                const status = get(p.id);
                const record = saved.find((r) => r.personId === p.id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.name}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {p.code}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-sm whitespace-normal">
                      {p.level ||
                        (kind === "teachers"
                          ? "Lecturer role not assigned"
                          : "Programme not assigned")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {(["Present", "Absent"] as const).map((v) => (
                          <Button
                            key={v}
                            size="sm"
                            variant={
                              status === v
                                ? v === "Present"
                                  ? "default"
                                  : "destructive"
                                : "outline"
                            }
                            aria-pressed={status === v}
                            disabled={future}
                            onClick={() => setDraft({ ...draft, [p.id]: v })}
                          >
                            {v}
                          </Button>
                        ))}
                        {draft[p.id] && (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Undo ${p.name} change`}
                            onClick={() => {
                              const next = { ...draft };
                              delete next[p.id];
                              setDraft(next);
                            }}
                          >
                            Undo
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {record ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove saved attendance for ${p.name}`}
                          onClick={() => setDeleting(record)}
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Unmarked
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {!people.length && (
            <Empty text="No eligible people for this date and filter. Check enrollment dates and status." />
          )}
        </CardContent>
      </Card>
      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this attendance record?</AlertDialogTitle>
            <AlertDialogDescription>
              The person will become unmarked for this date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (
                  deleting &&
                  saveDatabase({
                    ...db,
                    attendance: db.attendance.filter(
                      (r) =>
                        !(
                          r.kind === deleting.kind &&
                          r.personId === deleting.personId &&
                          r.date === deleting.date
                        ),
                    ),
                  })
                ) {
                  const next = { ...draft };
                  delete next[deleting.personId];
                  setDraft(next);
                  setDeleting(null);
                  toast.success("Attendance record removed");
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function Profile({ db, id }: { db: Database; id: string }) {
  const p = db.students.find((s) => s.id === id);
  const [editing, setEditing] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  if (!p)
    return (
      <>
        <Heading
          title="Student not found"
          description="The record may have been deleted."
        />
        <Button nativeButton={false} render={<Link href="/students" />}>
          Back to students
        </Button>
      </>
    );
  const records = db.attendance
    .filter(
      (r) =>
        r.kind === "students" &&
        r.personId === id &&
        (!from || r.date >= from) &&
        (!to || r.date <= to),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const s = summary(records);
  return (
    <>
      <Button
        variant="ghost"
        nativeButton={false}
        render={<Link href="/students" />}
      >
        <ArrowLeft />
        Back to students
      </Button>
      <Heading
        title={p.name}
        description={`${p.code} · ${p.level || "Programme not assigned"}`}
      >
        <Button variant="outline" onClick={() => setEditing(true)}>
          <Pencil />
          Edit student
        </Button>
      </Heading>
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Student details</CardTitle>
            <Status value={p.status} />
          </CardHeader>
          <CardContent>
            <dl className="space-y-5 text-sm">
              {[
                ["Email", p.email || "Not provided"],
                ["Phone", p.phone || "Not provided"],
                ["Programme", p.level || "Not assigned"],
                ["Enrollment date", p.enrolled],
                ["Notes", p.notes || "No notes"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="mt-1 break-words">{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardContent className="flex flex-wrap gap-4 pt-5">
              <div className="space-y-2">
                <Label htmlFor="profile-from">From</Label>
                <Input
                  id="profile-from"
                  type="date"
                  value={from}
                  onInput={(e) => setFrom(e.currentTarget.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-to">To</Label>
                <Input
                  id="profile-to"
                  type="date"
                  value={to}
                  onInput={(e) => setTo(e.currentTarget.value)}
                />
              </div>
              <Button
                variant="ghost"
                className="self-end"
                onClick={() => {
                  setFrom("");
                  setTo("");
                }}
              >
                All dates
              </Button>
            </CardContent>
          </Card>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="Attendance rate"
              value={s.rate === null ? "—" : `${s.rate}%`}
              detail={`${s.total} recorded days`}
              icon={<TrendingUp />}
            />
            <Stat
              label="Present"
              value={s.present}
              detail="Recorded days present"
              icon={<Check />}
            />
            <Stat
              label="Absent"
              value={s.absent}
              detail="Recorded days absent"
              icon={<CalendarCheck />}
            />
          </div>
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Attendance journey</CardTitle>
              <CardDescription>
                Monthly totals within the selected date range
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AttendanceChart records={records} monthly />
            </CardContent>
          </Card>
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle>Attendance history</CardTitle>
            <Button
              variant="outline"
              onClick={() =>
                exportCsv(
                  [
                    ["Date", "Status"],
                    ...records.map((r) => [r.date, r.status]),
                  ],
                  `${p.code}-attendance.csv`,
                )
              }
            >
              <Download />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <History records={records} />
        </CardContent>
      </Card>
      {editing && (
        <PersonEditor
          db={db}
          kind="students"
          person={p}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
function History({ records }: { records: Attendance[] }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(records.length / 15));
  const current = Math.min(page, pages - 1);
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.slice(current * 15, current * 15 + 15).map((r) => (
            <TableRow key={`${r.personId}:${r.date}`}>
              <TableCell>{r.date}</TableCell>
              <TableCell>
                <Status value={r.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!records.length && (
        <Empty text="No attendance records in this date range." />
      )}
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {records.length} records · Page {current + 1} of {pages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={current === pages - 1}
            onClick={() => setPage(current + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}

export function Reports({ db }: { db: Database }) {
  const [kind, setKind] = useState<Kind>("students");
  const [level, setLevel] = useState("All levels");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const people = db[kind].filter(
    (p) => level === "All levels" || p.level === level,
  );
  const ids = new Set(people.map((p) => p.id));
  const records = db.attendance.filter(
    (r) =>
      r.kind === kind &&
      ids.has(r.personId) &&
      (!from || r.date >= from) &&
      (!to || r.date <= to),
  );
  const s = summary(records);
  const csv = [
    [
      "ID",
      "Name",
      "Level",
      "Recorded days",
      "Present",
      "Absent",
      "Attendance %",
    ],
    ...people.map((p) => {
      const stat = summary(records.filter((r) => r.personId === p.id));
      return [
        p.code,
        p.name,
        p.level,
        String(stat.total),
        String(stat.present),
        String(stat.absent),
        stat.rate === null ? "" : String(stat.rate),
      ];
    }),
  ];
  return (
    <>
      <Heading
        title="Attendance reports"
        description="Compare attendance and export the records you need."
      >
        <Button
          variant="outline"
          onClick={() => exportCsv(csv, "aims-attendance-report.csv")}
        >
          <Download />
          Export report
        </Button>
      </Heading>
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-5">
          <div className="w-40 space-y-2">
            <Label>People</Label>
            <Choice
              label="Report people"
              value={kind}
              onChange={(v) => setKind(v as Kind)}
              items={["students", "teachers"]}
            />
          </div>
          <div className="w-40 space-y-2">
            <Label>Level</Label>
            <Choice
              label="Report level"
              value={level}
              onChange={setLevel}
              items={[
                "All levels",
                ...(kind === "students" ? levels : teacherLevels),
              ]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-from">From</Label>
            <Input
              id="report-from"
              type="date"
              value={from}
              onInput={(e) => setFrom(e.currentTarget.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-to">To</Label>
            <Input
              id="report-to"
              type="date"
              value={to}
              onInput={(e) => setTo(e.currentTarget.value)}
            />
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            All dates
          </Button>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Attendance rate"
          value={s.rate === null ? "—" : `${s.rate}%`}
          detail="Present / all recorded attendance"
          icon={<TrendingUp />}
        />
        <Stat
          label="Present records"
          value={s.present}
          detail="Within selected filters"
          icon={<Check />}
        />
        <Stat
          label="Absent records"
          value={s.absent}
          detail="Within selected filters"
          icon={<CalendarCheck />}
        />
      </div>
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">By person</TabsTrigger>
          <TabsTrigger value="trend">Daily trend</TabsTrigger>
        </TabsList>
        <TabsContent value="summary">
          <Card>
            <CardContent className="pt-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    {csv[0].map((c) => (
                      <TableHead key={c}>{c}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {people.map((p) => {
                    const stat = summary(
                      records.filter((r) => r.personId === p.id),
                    );
                    return (
                      <TableRow key={p.id}>
                        <TableCell>{p.code}</TableCell>
                        <TableCell>
                          {kind === "students" ? (
                            <Link
                              className="text-primary hover:underline"
                              href={`/students/${p.id}`}
                            >
                              {p.name}
                            </Link>
                          ) : (
                            p.name
                          )}
                        </TableCell>
                        <TableCell className="max-w-sm whitespace-normal">
                          {p.level ||
                            (kind === "teachers"
                              ? "Lecturer role not assigned"
                              : "Programme not assigned")}
                        </TableCell>
                        <TableCell>{stat.total}</TableCell>
                        <TableCell>{stat.present}</TableCell>
                        <TableCell>{stat.absent}</TableCell>
                        <TableCell>
                          {stat.rate === null ? "—" : `${stat.rate}%`}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {!people.length && (
                <Empty text="No people match these filters." />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle>Daily attendance</CardTitle>
              <CardDescription>
                Latest 12 recorded dates within the selected filters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AttendanceChart records={records} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <p className="text-xs text-muted-foreground">
        Attendance percentages count saved present and absent records. Unmarked
        dates are excluded.
      </p>
    </>
  );
}

export function SettingsPage({ db }: { db: Database }) {
  const [pending, setPending] = useState<Database | null>(null);
  async function readBackup(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 10_000_000) throw new Error("File too large");
      const parsed = migrateDatabase(JSON.parse(await file.text()));
      const keys = new Set<string>();
      for (const kind of ["students", "teachers"] as const) {
        const ids = new Set(parsed[kind].map((p) => p.id));
        const codes = new Set(parsed[kind].map((p) => p.code.toLowerCase()));
        if (
          ids.size !== parsed[kind].length ||
          codes.size !== parsed[kind].length
        )
          throw new Error("Duplicate people");
        for (const r of parsed.attendance.filter((a) => a.kind === kind)) {
          const key = `${kind}:${r.personId}:${r.date}`;
          if (!ids.has(r.personId) || keys.has(key))
            throw new Error("Invalid attendance");
          keys.add(key);
        }
      }
      setPending(parsed);
    } catch {
      toast.error(
        "Invalid AIMS backup. Select a valid JSON export without duplicate or orphan records.",
      );
    }
  }
  return (
    <>
      <Heading
        title="Workspace settings"
        description="Keep your local records backed up and ready for the next phase."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DatabaseIcon className="size-5" />
              Local data & backups
            </CardTitle>
            <CardDescription>
              {db.students.length} students · {db.teachers.length} teachers ·{" "}
              {db.attendance.length} attendance records
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Data is stored in this browser on this device. Clearing browser
              data removes it. Export a JSON backup to preserve all records or
              move them to another browser.
            </p>
            <Button
              onClick={() =>
                download(
                  new Blob([JSON.stringify(db, null, 2)], {
                    type: "application/json",
                  }),
                  `aims-backup-${today()}.json`,
                )
              }
            >
              <Download />
              Export full backup
            </Button>
            <div className="space-y-2">
              <Label htmlFor="backup">Restore JSON backup</Label>
              <Input
                id="backup"
                type="file"
                accept="application/json,.json"
                onChange={(e) => {
                  void readBackup(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <p className="text-xs text-muted-foreground">
                You will confirm before existing records are replaced.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Academy workspace</CardTitle>
            <CardDescription>AIMS Academy Attendance Portal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between border-b pb-3">
              <span>Levels</span>
              <span>7 OTHM programmes</span>
            </div>
            <div className="flex justify-between border-b pb-3">
              <span>Attendance</span>
              <span>Present / Absent</span>
            </div>
            <div className="flex justify-between border-b pb-3">
              <span>Academy timezone</span>
              <span>Asia/Dhaka</span>
            </div>
            <div className="flex justify-between">
              <span>Authentication</span>
              <span>Local demo</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <Alert>
        <Upload />
        <AlertTitle>Next phase: connected academy</AlertTitle>
        <AlertDescription>
          Supabase will provide secure admin authentication and shared database
          records. Vercel deployment will follow after you approve it. The
          current version is a local preview with sample data.
        </AlertDescription>
      </Alert>
      <AlertDialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces all local records with {pending?.students.length}{" "}
              students, {pending?.teachers.length} teachers, and{" "}
              {pending?.attendance.length} attendance records. Export your
              current backup first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending && restoreDatabase(pending)) {
                  setPending(null);
                  toast.success("Backup restored");
                }
              }}
            >
              Restore backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
