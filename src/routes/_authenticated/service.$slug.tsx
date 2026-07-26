import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { findService } from "@/lib/services";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/service/$slug")({
  head: () => ({
    meta: [
      { title: "Service Access — UDCS, UNIDEL Agbor" },
      {
        name: "description",
        content:
          "Simulated single sign-on access to a University of Delta service using your unified digital credential.",
      },
      { property: "og:title", content: "Service Access — UDCS" },
      {
        property: "og:description",
        content: "Access university services with one unified digital credential.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ServicePage,
});

function ServicePage() {
  const { slug } = Route.useParams();
  const service = findService(slug);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-8 text-center shadow-card">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-success">
          <CheckCircle2 className="size-7" />
        </span>
        <h1 className="mt-5 text-2xl font-bold">{service?.name ?? "University Service"}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          You have successfully accessed this service using your Unified Digital Credential.
        </p>
        {service ? (
          <p className="mt-2 text-xs text-muted-foreground">{service.description}</p>
        ) : null}
        <div className="mt-7">
          <Button asChild variant="secondary">
            <Link to="/dashboard">
              <ArrowLeft className="size-4" /> Back to dashboard
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
