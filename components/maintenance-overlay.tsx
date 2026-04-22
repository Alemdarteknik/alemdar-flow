import Image from "next/image";
import { AlertTriangle, Wrench } from "lucide-react";

export function MaintenanceOverlay() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-16 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-primary/10 via-background to-background" />
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-ring/20 blur-3xl" />

      <section className="relative z-10 w-full max-w-xl rounded-2xl border border-border bg-card/95 p-8 text-card-foreground shadow-2xl backdrop-blur">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-primary/40 bg-primary/15 p-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium tracking-wide text-primary">
              Service Notice
            </span>
          </div>
          <Image
            src="/placeholder-logo.svg"
            alt="Alemdar Teknik"
            width={42}
            height={42}
            priority
            className="rounded-md border border-border bg-background p-1"
          />
        </div>

        <h1 className="text-balance text-3xl font-semibold leading-tight sm:text-4xl">
          Maintenance in progress
        </h1>

        <p className="mt-4 text-pretty text-muted-foreground">
          We are applying an urgent fix. The platform is temporarily inactive
          and will be back online in a few minutes.
        </p>

        <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground">
            <Wrench className="h-4 w-4 text-primary" />
            <span>Thank you for your patience.</span>
          </div>
          <p className="mt-2 text-muted-foreground">
            Please refresh this page shortly to continue.
          </p>
        </div>
      </section>
    </main>
  );
}
