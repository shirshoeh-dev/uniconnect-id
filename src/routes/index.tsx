import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, ShieldCheck, Loader2, QrCode as QrIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { provisionDemoAccounts, recordLogin } from "@/lib/udcs.functions";
import { isAdminUser, storeLogId } from "@/lib/auth-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UDCS Login — Unified Digital Credentials, UNIDEL Agbor" },
      {
        name: "description",
        content:
          "Sign in to the Unified Digital Credentials System of the University of Delta, Agbor: one student identity for portal, library, hostel, exams and events.",
      },
      { property: "og:title", content: "UDCS — Unified Digital Credentials System, UNIDEL Agbor" },
      {
        property: "og:description",
        content: "One student account, one digital ID, access to every university service.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"student" | "admin">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    provisionDemoAccounts()
      .catch(() => null)
      .finally(() => setReady(true));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      setLoading(false);
      toast.error(error?.message ?? "Invalid credentials");
      return;
    }

    try {
      const log = await recordLogin();
      storeLogId(log.logId);
    } catch {
      /* logging is best-effort */
    }

    const admin = await isAdminUser(data.user.id);
    setLoading(false);

    if (mode === "admin" && !admin) {
      toast.error("This account is not an administrator account.");
      await supabase.auth.signOut();
      return;
    }

    navigate({ to: admin ? "/admin" : "/dashboard" });
  }

  function fillDemo(kind: "student" | "admin") {
    if (kind === "admin") {
      setMode("admin");
      setEmail("admin@unidel.edu.ng");
      setPassword("admin1234");
    } else {
      setMode("student");
      setEmail("chidi.okonkwo@student.unidel.edu.ng");
      setPassword("student1234");
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="bg-brand-gradient relative hidden flex-col justify-between p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-accent text-accent-foreground">
            <GraduationCap className="size-6" />
          </span>
          <div>
            <p className="text-lg font-bold leading-tight">UDCS</p>
            <p className="text-xs uppercase tracking-[0.2em] opacity-80">
              University of Delta, Agbor
            </p>
          </div>
        </div>

        <div className="max-w-md space-y-5">
          <h1 className="text-4xl font-bold leading-tight">
            One student identity for every university service.
          </h1>
          <p className="text-sm leading-relaxed opacity-90">
            The Unified Digital Credentials System issues each student a verifiable digital ID with
            a QR code, and signs them straight into the student portal, library, hostel,
            examination portal and campus events — no second login.
          </p>
          <ul className="space-y-2 text-sm opacity-90">
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-accent" /> Hashed passwords &amp; session
              authentication
            </li>
            <li className="flex items-center gap-2">
              <QrIcon className="size-4 text-accent" /> Publicly scannable credential verification
            </li>
          </ul>
        </div>

        <p className="text-xs opacity-70">Academic MVP · Unified Digital Credentials System</p>
      </section>

      <section className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <p className="text-xl font-bold">UDCS</p>
            <p className="text-sm text-muted-foreground">University of Delta, Agbor</p>
          </div>

          <h2 className="text-2xl font-bold">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Accounts are created by the administrator. There is no public registration.
          </p>

          <Tabs
            value={mode}
            onValueChange={(value) => setMode(value as "student" | "admin")}
            className="mt-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="admin">Administrator</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@student.unidel.edu.ng"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !ready}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-8 rounded-xl border bg-card p-4 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Demo accounts
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => fillDemo("student")}>
                Use student account
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => fillDemo("admin")}>
                Use admin account
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Students: <code>student1234</code> · Administrator: <code>admin1234</code>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
