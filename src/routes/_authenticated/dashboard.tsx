import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Building2,
  CalendarDays,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signOutWithLogging } from "@/lib/auth-session";
import { DigitalIdCard, type StudentRecord } from "@/components/DigitalIdCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SERVICES } from "@/lib/services";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — UDCS, UNIDEL Agbor" },
      {
        name: "description",
        content:
          "Your digital student ID, QR credential and single sign-on links to University of Delta services.",
      },
      { property: "og:title", content: "Student Dashboard — UDCS" },
      { property: "og:description", content: "Digital student ID, QR credential and service access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentDashboard,
});

const ICONS = {
  portal: LayoutDashboard,
  library: BookOpen,
  hostel: Building2,
  examinations: FileText,
  events: CalendarDays,
} as const;

function StudentDashboard() {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const { data: student, isLoading } = useQuery({
    queryKey: ["my-student"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return data as StudentRecord | null;
    },
  });

  async function handleSignOut() {
    await signOutWithLogging();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-brand-gradient text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-accent text-accent-foreground">
              <GraduationCap className="size-5" />
            </span>
            <div>
              <p className="font-bold leading-tight">UDCS Student Portal</p>
              <p className="text-xs opacity-80">University of Delta, Agbor</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={handleSignOut}>
            <LogOut className="size-4" /> Log out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading your credential…</p>
        ) : !student ? (
          <Card className="shadow-card">
            <CardContent className="py-8 text-sm text-muted-foreground">
              No student record is linked to this account. Please contact the administrator.
            </CardContent>
          </Card>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold">Welcome, {student.first_name}</h1>
              <p className="text-sm text-muted-foreground">
                Your unified digital credential is active. Use it across all university services.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
              <DigitalIdCard student={student} origin={origin} />

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-base">Personal profile</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <Detail label="Full name" value={`${student.first_name} ${student.last_name}`} />
                  <Detail label="Matric number" value={student.matric_number} />
                  <Detail label="Faculty" value={student.faculty} />
                  <Detail label="Department" value={student.department} />
                  <Detail label="Level" value={student.level} />
                  <Detail label="Digital ID" value={student.digital_id} />
                  <Detail label="Email" value={student.email} />
                  <Detail label="Phone" value={student.phone ?? "—"} />
                </CardContent>
              </Card>
            </div>

            <section>
              <h2 className="text-lg font-semibold">University services</h2>
              <p className="text-sm text-muted-foreground">
                Single sign-on — you will not be asked to log in again.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {SERVICES.map((service) => {
                  const Icon = ICONS[service.slug];
                  return (
                    <Link
                      key={service.slug}
                      to="/service/$slug"
                      params={{ slug: service.slug }}
                      className="group rounded-xl border bg-card p-5 shadow-card transition-colors hover:border-primary"
                    >
                      <span className="grid size-10 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                        <Icon className="size-5" />
                      </span>
                      <p className="mt-3 font-semibold group-hover:text-primary">{service.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{service.description}</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="break-words font-medium">{value}</p>
    </div>
  );
}
