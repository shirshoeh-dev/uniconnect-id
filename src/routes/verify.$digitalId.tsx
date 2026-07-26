import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ShieldAlert, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/verify/$digitalId")({
  head: () => ({
    meta: [
      { title: "Credential Verification — UDCS, UNIDEL Agbor" },
      {
        name: "description",
        content:
          "Verify a University of Delta, Agbor student digital credential by scanning its QR code or entering the digital ID.",
      },
      { property: "og:title", content: "Credential Verification — UDCS, UNIDEL Agbor" },
      {
        property: "og:description",
        content: "Public verification of University of Delta student digital credentials.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerifyPage,
});

type VerifyRow = {
  full_name: string;
  matric_number: string;
  digital_id: string;
  faculty: string;
  department: string;
  level: string;
  status: string;
};

function VerifyPage() {
  const { digitalId } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["verify", digitalId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("verify_credential", { _digital_id: digitalId });
      if (error) throw error;
      return ((data as VerifyRow[] | null) ?? [])[0] ?? null;
    },
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <GraduationCap className="size-4" />
          University of Delta, Agbor — Credential Verification
        </div>

        {isLoading ? (
          <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-card">
            Verifying credential…
          </div>
        ) : data ? (
          <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
            <div className="flex items-center gap-3 border-b bg-secondary px-6 py-4">
              <BadgeCheck className="size-6 text-success" />
              <div>
                <p className="font-bold">Credential {data.status}</p>
                <p className="text-xs text-muted-foreground">
                  Issued by the Unified Digital Credentials System
                </p>
              </div>
            </div>
            <dl className="grid gap-4 px-6 py-6 text-sm">
              <Row label="Student Name" value={data.full_name} />
              <Row label="Matric Number" value={data.matric_number} />
              <Row label="Digital ID" value={data.digital_id} />
              <Row label="Faculty" value={data.faculty} />
              <Row label="Department" value={data.department} />
              <Row label="Level" value={data.level} />
              <Row label="Status" value={data.status} />
            </dl>
          </div>
        ) : (
          <div className="rounded-2xl border border-destructive/40 bg-card p-8 text-center shadow-card">
            <ShieldAlert className="mx-auto size-8 text-destructive" />
            <p className="mt-4 text-lg font-bold text-destructive">Invalid Credential</p>
            <p className="mt-2 text-sm text-muted-foreground">
              No student record matches the digital ID{" "}
              <span className="font-mono">{digitalId}</span>.
            </p>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm underline underline-offset-4 text-muted-foreground">
            Back to UDCS
          </Link>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
