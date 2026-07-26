import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { GraduationCap, LogOut, Pencil, Plus, Search, Trash2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signOutWithLogging } from "@/lib/auth-session";
import { createStudent, deleteStudent } from "@/lib/udcs.functions";
import { DigitalIdCard, type StudentRecord } from "@/components/DigitalIdCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — UDCS, UNIDEL Agbor" },
      {
        name: "description",
        content:
          "Manage student digital credentials, view login activity and monitor the Unified Digital Credentials System of UNIDEL Agbor.",
      },
      { property: "og:title", content: "Admin Dashboard — UDCS" },
      {
        property: "og:description",
        content: "Student management and login logs for the Unified Digital Credentials System.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminDashboard,
});

type LoginLog = {
  id: string;
  login_time: string;
  logout_time: string | null;
  browser: string | null;
  ip_address: string | null;
  student_id: string | null;
};

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  matric_number: "",
  faculty: "",
  department: "",
  level: "",
  email: "",
  phone: "",
  password: "",
};

function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editing, setEditing] = useState<StudentRecord | null>(null);
  const [viewing, setViewing] = useState<StudentRecord | null>(null);

  const studentsQuery = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StudentRecord[];
    },
  });

  const logsQuery = useQuery({
    queryKey: ["admin-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("login_logs")
        .select("*")
        .order("login_time", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as LoginLog[];
    },
  });

  const students = studentsQuery.data ?? [];
  const logs = logsQuery.data ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter((s) =>
      [s.first_name, s.last_name, s.matric_number, s.digital_id, s.department, s.faculty, s.email]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [students, search]);

  const studentNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students) map.set(s.id, `${s.first_name} ${s.last_name} (${s.matric_number})`);
    return map;
  }, [students]);

  const addMutation = useMutation({
    mutationFn: async () => createStudent({ data: form }),
    onSuccess: () => {
      toast.success("Student added");
      setAddOpen(false);
      setForm({ ...EMPTY_FORM });
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (student: StudentRecord) => {
      const { error } = await supabase
        .from("students")
        .update({
          first_name: student.first_name,
          last_name: student.last_name,
          matric_number: student.matric_number,
          faculty: student.faculty,
          department: student.department,
          level: student.level,
          phone: student.phone,
          is_active: student.is_active,
        })
        .eq("id", student.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Student updated");
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteStudent({ data: { id } }),
    onSuccess: () => {
      toast.success("Student deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function handleSignOut() {
    await signOutWithLogging();
    navigate({ to: "/", replace: true });
  }

  const stats = [
    { label: "Total Students", value: students.length },
    { label: "Active Students", value: students.filter((s) => s.is_active).length },
    { label: "Total Logins", value: logs.length },
    {
      label: "Sessions Open",
      value: logs.filter((l) => !l.logout_time).length,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-brand-gradient text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-accent text-accent-foreground">
              <GraduationCap className="size-5" />
            </span>
            <div>
              <p className="font-bold leading-tight">UDCS Administration</p>
              <p className="text-xs opacity-80">University of Delta, Agbor</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={handleSignOut}>
            <LogOut className="size-4" /> Log out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="shadow-card">
              <CardContent className="py-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-2 text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="students">
          <TabsList>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="recent">Recently Added</TabsTrigger>
            <TabsTrigger value="logs">Login Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by name, matric number, digital ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  maxLength={100}
                />
              </div>
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="size-4" /> Add student
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-secondary-foreground">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Matric No.</th>
                    <th className="px-4 py-3">Digital ID</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((student) => (
                    <tr key={student.id} className="border-t">
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {student.first_name} {student.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      </td>
                      <td className="px-4 py-3">{student.matric_number}</td>
                      <td className="px-4 py-3 font-mono text-xs">{student.digital_id}</td>
                      <td className="px-4 py-3">{student.department}</td>
                      <td className="px-4 py-3">{student.level}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setViewing(student)}>
                            <Eye className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditing(student)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Delete ${student.first_name} ${student.last_name}?`)) {
                                deleteMutation.mutate(student.id);
                              }
                            }}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No students found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="recent" className="mt-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Recently added students</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {students.slice(0, 5).map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">
                        {student.first_name} {student.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {student.matric_number} · {student.department}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {student.digital_id}
                    </span>
                  </div>
                ))}
                {students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No students yet.</p>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="mt-6">
            <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-secondary-foreground">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Login time</th>
                    <th className="px-4 py-3">Logout time</th>
                    <th className="px-4 py-3">Browser</th>
                    <th className="px-4 py-3">IP address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-t">
                      <td className="px-4 py-3">
                        {log.student_id ? studentNames.get(log.student_id) ?? "—" : "Administrator"}
                      </td>
                      <td className="px-4 py-3">{new Date(log.login_time).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {log.logout_time ? new Date(log.logout_time).toLocaleString() : "Active"}
                      </td>
                      <td className="max-w-[240px] truncate px-4 py-3 text-xs text-muted-foreground">
                        {log.browser ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{log.ip_address ?? "—"}</td>
                    </tr>
                  ))}
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No login activity recorded yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add student */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add student</DialogTitle>
            <DialogDescription>
              A login account and digital ID are created automatically.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              addMutation.mutate();
            }}
          >
            <FormField label="First name" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} />
            <FormField label="Last name" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />
            <FormField label="Matric number" value={form.matric_number} onChange={(v) => setForm({ ...form, matric_number: v })} />
            <FormField label="Level" value={form.level} onChange={(v) => setForm({ ...form, level: v })} />
            <FormField label="Faculty" value={form.faculty} onChange={(v) => setForm({ ...form, faculty: v })} />
            <FormField label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
            <FormField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <FormField label="Phone number" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <div className="sm:col-span-2">
              <FormField
                label="Password (min 8 characters)"
                type="password"
                value={form.password}
                onChange={(v) => setForm({ ...form, password: v })}
              />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Creating…" : "Create student"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit student */}
      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit student</DialogTitle>
            <DialogDescription>Email and digital ID cannot be changed.</DialogDescription>
          </DialogHeader>
          {editing ? (
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                updateMutation.mutate(editing);
              }}
            >
              <FormField label="First name" value={editing.first_name} onChange={(v) => setEditing({ ...editing, first_name: v })} />
              <FormField label="Last name" value={editing.last_name} onChange={(v) => setEditing({ ...editing, last_name: v })} />
              <FormField label="Matric number" value={editing.matric_number} onChange={(v) => setEditing({ ...editing, matric_number: v })} />
              <FormField label="Level" value={editing.level} onChange={(v) => setEditing({ ...editing, level: v })} />
              <FormField label="Faculty" value={editing.faculty} onChange={(v) => setEditing({ ...editing, faculty: v })} />
              <FormField label="Department" value={editing.department} onChange={(v) => setEditing({ ...editing, department: v })} />
              <FormField label="Phone number" value={editing.phone ?? ""} onChange={(v) => setEditing({ ...editing, phone: v })} />
              <DialogFooter className="sm:col-span-2">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* View profile */}
      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Student profile</DialogTitle>
            <DialogDescription>Digital credential issued by UDCS.</DialogDescription>
          </DialogHeader>
          {viewing ? (
            <div className="space-y-4">
              <DigitalIdCard
                student={viewing}
                origin={typeof window === "undefined" ? "" : window.location.origin}
              />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <p className="text-muted-foreground">Email</p>
                <p className="text-right break-words">{viewing.email}</p>
                <p className="text-muted-foreground">Phone</p>
                <p className="text-right">{viewing.phone ?? "—"}</p>
                <p className="text-muted-foreground">Status</p>
                <p className="text-right">{viewing.is_active ? "Active" : "Inactive"}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        required
        maxLength={type === "password" ? 72 : 255}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
