import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Database,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/interest-setup")({
  head: () => ({
    meta: [
      { title: "Interest Feature Setup — Admin" },
      {
        name: "description",
        content: "Diagnostic page that shows which interest-feature migrations are applied.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InterestSetupPage,
});

// ====================================================================
// Probe targets: the 6 new tables + 11 new RPC functions. The page
// probes each one via the Supabase REST API and shows a green check
// (exists), red X (missing), or warning (exists but missing grants).
// ====================================================================
const TABLES = [
  "interest_agreements",
  "interest_agreement_rate_history",
  "loans",
  "interest_payments",
  "interest_adjustments",
  "idempotency_log",
] as const;

const RPCS = [
  "accrue_interest_to_date",
  "create_khata_sale_with_interest",
  "create_direct_loan",
  "record_interest_payment",
  "revise_interest_rate",
  "record_interest_adjustment",
  "settle_interest_agreement",
  "search_product_sales",
  "aggregate_most_sold_products",
  "load_active_interest_agreements",
  "load_customer_interest_agreements",
] as const;

type ProbeStatus = "pending" | "exists" | "missing" | "needs-auth" | "unknown" | "error";

type Probe = {
  name: string;
  kind: "table" | "rpc";
  status: ProbeStatus;
  detail?: string;
};

// SQL snippets the user can copy for missing items. Each is a one-liner
// pointer to the full migration file in the repo, since the actual
// CREATE statements are too long to inline here.
const MIGRATION_HINTS: Record<string, string> = {
  interest_agreements: "Migration 1 of 9: 20261016100000_interest_agreements.sql",
  interest_agreement_rate_history: "Migration 1 of 9: 20261016100000_interest_agreements.sql",
  loans: "Migration 2 of 9: 20261016110000_loans.sql",
  interest_payments: "Migration 3 of 9: 20261016120000_interest_payments.sql",
  interest_adjustments: "Migration 4 of 9: 20261016130000_interest_adjustments_idempotency.sql",
  idempotency_log: "Migration 4 of 9: 20261016130000_interest_adjustments_idempotency.sql",
  accrue_interest_to_date: "Migration 5 of 9: 20261016140000_accrue_interest.sql",
  create_khata_sale_with_interest:
    "Migration 6 of 9: 20261016150000_create_khata_sale_with_interest.sql",
  create_direct_loan: "Migration 7 of 9: 20261016160000_interest_rpc_actions.sql",
  record_interest_payment: "Migration 7 of 9: 20261016160000_interest_rpc_actions.sql",
  revise_interest_rate: "Migration 7 of 9: 20261016160000_interest_rpc_actions.sql",
  record_interest_adjustment: "Migration 7 of 9: 20261016160000_interest_rpc_actions.sql",
  settle_interest_agreement: "Migration 7 of 9: 20261016160000_interest_rpc_actions.sql",
  search_product_sales: "Migration 8 of 9: 20261016170000_product_sales_search.sql",
  aggregate_most_sold_products: "Migration 8 of 9: 20261016170000_product_sales_search.sql",
  load_active_interest_agreements: "Migration 9 of 9: 20261016180000_interest_list_rpcs_recon.sql",
  load_customer_interest_agreements:
    "Migration 9 of 9: 20261016180000_interest_list_rpcs_recon.sql",
};

// Map of required parameters (those without DEFAULT) for each RPC, used to
// call the function with null values for required args so the function body
// actually executes (instead of returning PGRST202 "function not found" for
// an empty-args call to a function with required params).
//
// When the function body executes against an unauthenticated request:
//   - GRANT EXECUTE TO authenticated: anon gets 42501 "permission denied for function"
//   - For authenticated staff: function body runs, is_staff() returns true, may raise
//     a domain-specific error (e.g. "Interest agreement X not found") which is also
//     a valid signal that the function exists.
//
// Either way, this distinguishes "function exists" from "function missing".
const RPC_REQUIRED_PARAMS: Record<string, Record<string, null>> = {
  // Required params (no DEFAULT in the function signature):
  accrue_interest_to_date: { _agreement_id: null },
  create_khata_sale_with_interest: { _customer_id: null, _items: null },
  create_direct_loan: { _customer_id: null, _principal: null, _interest_rate: null },
  record_interest_adjustment: {
    _agreement_id: null,
    _adjustment_type: null,
    _reason: null,
  },
  record_interest_payment: { _agreement_id: null, _amount: null },
  revise_interest_rate: {
    _agreement_id: null,
    _new_rate: null,
    _new_rate_period: null,
    _reason: null,
  },
  settle_interest_agreement: { _agreement_id: null },
  load_customer_interest_agreements: { _customer_id: null },
  // All-default-param RPCs: pass empty args (existing behavior works).
  search_product_sales: {},
  aggregate_most_sold_products: {},
  load_active_interest_agreements: {},
};

function InterestSetupPage() {
  const [probes, setProbes] = useState<Probe[]>([]);
  const [loading, setLoading] = useState(true);

  const runProbes = useCallback(async () => {
    setLoading(true);
    const initial: Probe[] = [
      ...TABLES.map((name) => ({ name, kind: "table" as const, status: "pending" as ProbeStatus })),
      ...RPCS.map((name) => ({ name, kind: "rpc" as const, status: "pending" as ProbeStatus })),
    ];
    setProbes(initial);

    // Run all probes in parallel. Each probe sets its own status.
    const results = await Promise.all(
      initial.map(async (probe): Promise<Probe> => {
        try {
          if (probe.kind === "table") {
            // Use GET (not HEAD) so PostgREST returns the error body
            // with code/message when permission is denied. With HEAD,
            // the body is suppressed and we can't classify the error.
            const { error } = await supabase
              .from(probe.name as never)
              .select("id")
              .limit(1);

            if (!error) return { ...probe, status: "exists" };
            const code = (error as { code?: string }).code ?? "";
            const message = error.message ?? "Unknown error";

            // PGRST205 = table not found in schema cache
            if (code === "PGRST205" || /could not find the table/i.test(message)) {
              return { ...probe, status: "missing", detail: message };
            }
            // 42501 = permission denied = table EXISTS but RLS blocks anon
            if (code === "42501" || /permission denied/i.test(message)) {
              return {
                ...probe,
                status: "exists",
                detail: "Permission denied (RLS) — needs auth login",
              };
            }
            return { ...probe, status: "error", detail: message };
          }

          // RPC probe: call with null values for required params (so the
          // function body executes) instead of empty {} (which PostgREST
          // rejects with PGRST202 for functions with required args).
          const requiredArgs = RPC_REQUIRED_PARAMS[probe.name] ?? {};
          const { error } = await supabase.rpc(probe.name as never, requiredArgs as never);
          if (!error) return { ...probe, status: "exists" };
          const code = (error as { code?: string }).code ?? "";
          const message = error.message ?? "Unknown error";
          // PGRST202 = function not found in the schema cache (with the
          // args we sent). Since we send the correct required params,
          // this means the function genuinely doesn't exist.
          if (code === "PGRST202" || /could not find the function/i.test(message)) {
            return { ...probe, status: "missing", detail: message };
          }
          // 42501 = permission denied (anon lacks EXECUTE on the function).
          // The function EXISTS — anon just can't call it.
          if (code === "42501" || /permission denied/i.test(message)) {
            return {
              ...probe,
              status: "exists",
              detail: "Permission denied — needs auth login",
            };
          }
          // Any other error means the function body executed and raised
          // an exception (e.g. "Not authorized" raised by the is_staff
          // check, or "Interest agreement X not found"). The function
          // EXISTS.
          return { ...probe, status: "exists", detail: message };
        } catch (err) {
          return {
            ...probe,
            status: "error",
            detail: err instanceof Error ? err.message : "Probe failed",
          };
        }
      }),
    );

    setProbes(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    void runProbes();
  }, [runProbes]);

  const tableProbes = probes.filter((p) => p.kind === "table");
  const rpcProbes = probes.filter((p) => p.kind === "rpc");
  const tableExistsCount = tableProbes.filter((p) => p.status === "exists").length;
  const rpcExistsCount = rpcProbes.filter((p) => p.status === "exists").length;
  const unknownCount = probes.filter(
    (p) => p.status === "unknown" || p.status === "needs-auth",
  ).length;
  const missingCount = probes.filter((p) => p.status === "missing").length;
  const allOk =
    !loading &&
    missingCount === 0 &&
    unknownCount === 0 &&
    tableExistsCount === TABLES.length &&
    rpcExistsCount === RPCS.length;

  function copyToClipboard(text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard");
    });
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <ModulePageHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Interest Feature Setup" }]}
        eyebrow="Diagnostic"
        title="Interest Feature Setup"
        description="Checks which interest-feature database migrations have been applied. Probes each new table and RPC function against your Supabase project."
        actions={
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => void runProbes()}
            disabled={loading}
          >
            <RefreshCw className={loading ? "mr-2 size-3.5 animate-spin" : "mr-2 size-3.5"} />
            Re-check
          </Button>
        }
      />

      {/* Summary card */}
      <Card className="shadow-soft">
        <CardHeader className="py-3 sm:py-4">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Database className="size-4" />
            Schema Status
            {allOk ? (
              <Badge className="rounded-full bg-success/15 text-success">All set up</Badge>
            ) : missingCount > 0 ? (
              <Badge className="rounded-full bg-destructive/15 text-destructive">
                {missingCount} item{missingCount === 1 ? "" : "s"} missing
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Tables</p>
              <p className="mt-0.5 text-lg font-semibold">
                {tableExistsCount} / {TABLES.length}
              </p>
            </div>
            <div className="rounded-lg border p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                RPC functions
              </p>
              <p className="mt-0.5 text-lg font-semibold">
                {rpcExistsCount} / {RPCS.length}
              </p>
            </div>
            <div className="rounded-lg border p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Missing</p>
              <p className="mt-0.5 text-lg font-semibold text-destructive">{missingCount}</p>
            </div>
            <div className="rounded-lg border p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Needs check
              </p>
              <p className="mt-0.5 text-lg font-semibold text-warning">{unknownCount}</p>
            </div>
            <div className="rounded-lg border p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</p>
              <p className="mt-0.5 text-sm font-semibold">
                {loading ? "Checking…" : allOk ? "Ready" : "Action needed"}
              </p>
            </div>
          </div>
          {allOk ? (
            <p className="mt-3 text-xs text-success sm:text-sm">
              ✓ All 6 tables and 11 RPC functions are installed. The interest feature is ready to
              use. Visit{" "}
              <a href="/admin/interest-management" className="underline">
                Interest Management
              </a>{" "}
              or open a customer's Khata page to get started.
            </p>
          ) : missingCount > 0 ? (
            <div className="mt-3 rounded-md border border-warning/40 bg-warning/5 p-2.5 text-xs sm:text-sm">
              <p className="font-medium text-warning">
                {missingCount} item{missingCount === 1 ? "" : "s"} need to be applied to your
                Supabase project.
              </p>
              <p className="mt-1 text-muted-foreground">
                Open the Supabase SQL Editor and apply only the missing migration listed below.
                Review table and policy changes before re-running any migration.
              </p>
              <a
                href="https://supabase.com/dashboard/project/cmfqlpcrnkswgxrszoog/sql/new"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs text-primary underline sm:text-sm"
              >
                Open Supabase SQL Editor →
              </a>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Tables list */}
      <Card className="shadow-soft">
        <CardHeader className="py-3 sm:py-4">
          <CardTitle className="text-sm sm:text-base">
            Tables ({tableExistsCount}/{TABLES.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {loading && tableProbes.length === 0 ? (
            <p className="text-xs text-muted-foreground sm:text-sm">Probing tables…</p>
          ) : (
            tableProbes.map((p) => (
              <ProbeRow key={p.name} probe={p} onCopyMigration={copyToClipboard} />
            ))
          )}
        </CardContent>
      </Card>

      {/* RPCs list */}
      <Card className="shadow-soft">
        <CardHeader className="py-3 sm:py-4">
          <CardTitle className="text-sm sm:text-base">
            RPC Functions ({rpcExistsCount}/{RPCS.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {loading && rpcProbes.length === 0 ? (
            <p className="text-xs text-muted-foreground sm:text-sm">Probing RPCs…</p>
          ) : (
            rpcProbes.map((p) => (
              <ProbeRow key={p.name} probe={p} onCopyMigration={copyToClipboard} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProbeRow({
  probe,
  onCopyMigration,
}: {
  probe: Probe;
  onCopyMigration: (text: string) => void;
}) {
  const icon =
    probe.status === "pending" ? (
      <Loader2 className="size-4 animate-spin text-muted-foreground" />
    ) : probe.status === "exists" ? (
      <CheckCircle2 className="size-4 text-success" />
    ) : probe.status === "missing" ? (
      <XCircle className="size-4 text-destructive" />
    ) : probe.status === "needs-auth" ? (
      <AlertCircle className="size-4 text-warning" />
    ) : (
      <AlertCircle className="size-4 text-warning" />
    );

  const hint = MIGRATION_HINTS[probe.name];

  return (
    <div className="flex items-start justify-between gap-2 rounded-md border p-2.5 text-xs sm:text-sm">
      <div className="flex min-w-0 items-start gap-2">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="font-mono font-medium">{probe.name}</p>
          {probe.detail ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{probe.detail}</p>
          ) : null}
          {probe.status === "missing" && hint ? (
            <p className="mt-1 text-[11px] text-warning">
              Apply <span className="font-mono">{hint}</span>
            </p>
          ) : null}
        </div>
      </div>
      {probe.status === "missing" && hint ? (
        <Button
          size="sm"
          variant="outline"
          className="h-7 shrink-0 rounded-full px-2.5 text-[11px]"
          onClick={() => onCopyMigration(hint)}
        >
          <Copy className="mr-1 size-3" />
          Copy
        </Button>
      ) : null}
    </div>
  );
}
