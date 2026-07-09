# Alemdar Flow Audit

Scope: `alemdar-flow` Next.js app only.

Original scope note: this started as an over-engineering audit, not a correctness or security review. After follow-up investigation, this document now keeps the simplification findings and also adds a small correctness appendix for bugs that are directly entangled with the same complexity.

Quick read:
- The audit still has real merit: the dashboard is carrying duplicate state models, duplicate normalization paths, dead hooks, dead routes, dead flags, and very large files.
- The old `currentEnergyView` live model has now been removed; live overview values come from `apiData`, and daily-row derivation is chart/history-only.
- Some exact counts in the original draft should be treated as estimates until re-verified with a proper import graph.
- Core dashboard logic was previously split across two overlapping live-data models; the remaining simplification work is to keep it that way and not reintroduce a second live model.
- Energy-summary math is implemented in both frontend and backend.
- The app is carrying multiple dead hooks, dead exports, dead flags, and stray package deps.
- The same complexity is now causing correctness bugs: serial identity is not trusted consistently, and customer grouping is using the wrong field.

## Findings

1. `delete:` The generated UI surface is still clearly larger than the app needs, but the original exact count should be re-verified before deleting aggressively. The broader point stands: there is a lot of shadcn/template residue in `components/ui/`, and trimming should start from verified imports rather than keeping the whole generated set forever. Replacement: nothing for verified dead wrappers. [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/components/ui`](./components/ui)

2. `done:` The grouped dashboard no longer uses a second live model for overview state. Live values now come from `apiData`, and daily-row derivation stays in chart/history summary code. Keep it that way. [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/app/dashboard/user/[userKey]/dashboard-user-client.tsx:455`](./app/dashboard/user/[userKey]/dashboard-user-client.tsx) [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/lib/dashboard-data.ts:1`](./lib/dashboard-data.ts) [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/components/dashboard-page/overview-tab.tsx:607`](./components/dashboard-page/overview-tab.tsx)

3. `done:` `currentEnergyView` has been removed completely. The live overview card now derives home, solar, grid, battery, and charging state from `apiData`, and daily-row normalization is no longer threaded through the live dashboard path. [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/components/dashboard-page/overview-tab.tsx:607`](./components/dashboard-page/overview-tab.tsx) [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/app/dashboard/user/[userKey]/dashboard-user-client.tsx:624`](./app/dashboard/user/[userKey]/dashboard-user-client.tsx) [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/lib/dashboard-data.ts:23`](./lib/dashboard-data.ts)

4. `yagni:` `aggregateApiData()` fabricates a fake inverter record with `"UNIFIED"` serial, `"Mixed"` labels, averaged voltages, and summed powers just to satisfy child prop types. Replacement: a dedicated aggregate view model instead of pretending multiple inverters are one inverter. [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/app/dashboard/user/[userKey]/dashboard-user-client.tsx:257`](./app/dashboard/user/[userKey]/dashboard-user-client.tsx)

5. `done:` Frontend energy-summary fallback rebuilds have been removed from `lib/watchpower.ts`. The client now trusts backend summary payloads and only merges already-computed summary buckets when it needs a combined view. [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/lib/watchpower.ts:1`](./lib/watchpower.ts)

6. `done:` The separate dashboard bootstrap hook file has been removed. Dashboard bootstrap queries now live in the main `use-inverter-data.ts` hook layer, so the app no longer carries a second dashboard-specific hook stack on top of the generic query layer. [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/hooks/use-inverter-data.ts:1`](./hooks/use-inverter-data.ts) [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/lib/dashboard-bootstrap.ts:1`](./lib/dashboard-bootstrap.ts)

7. `done:` `useTelemetrySocket` has been removed. The unused reconnecting WebSocket client and its extra state management no longer ship with the app. [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/hooks/useTelemetrySocket.ts:1`](./hooks/useTelemetrySocket.ts)

8. `done:` `useNavVisibility` has been removed. The unused scroll-aware visibility hook is no longer part of the bundle surface. [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/hooks/use-nav-visibility.ts:1`](./hooks/use-nav-visibility.ts)

9. `done:` `PowerFlowCards` and its unused prop type have been removed. The dashboard barrel no longer exports a dead card component. [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/components/dashboard-page/index.ts:1`](./components/dashboard-page/index.ts) [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/components/dashboard-page/power-flow-cards.tsx`](./components/dashboard-page/power-flow-cards.tsx)

10. `done:` The dead maintenance-mode branch has been removed. `layout.tsx` now renders children directly, and the unused overlay component is gone. [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/app/layout.tsx:1`](./app/layout.tsx) [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/components/maintenance-overlay.tsx:1`](./components/maintenance-overlay.tsx)

11. `done:` The `/home` redirect shell and `AuthGuard` have been removed. The app now keeps the single server-side entry path to `/systems/all` and no longer writes auth state just for that dead guard flow. [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/app/page.tsx:1`](./app/page.tsx) [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/app/home/page.tsx:1`](./app/home/page.tsx) [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/components/auth-guard.tsx:1`](./components/auth-guard.tsx)

12. `done:` The stray workspace-link deps have been removed from `package.json`, leaving only intentional app dependencies in the manifest. [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/package.json:1`](./package.json)

13. `done:` First-pass shrink work is in. The dashboard client date/aggregate helpers now live in [`dashboard-user-client-helpers.ts`](./app/dashboard/user/[userKey]/dashboard-user-client-helpers.ts), overview subcomponents now live in [`overview-tab-sections.tsx`](./components/dashboard-page/overview-tab-sections.tsx), and totals-tab date/summary/export helpers now live in [`totals-tab-helpers.ts`](./components/dashboard-page/totals-tab-helpers.ts). That cut `dashboard-user-client.tsx` from `1141` to `878` lines, `overview-tab.tsx` from `1371` to `916`, and `totals-tab.tsx` from `1340` to `1100`, while keeping behavior intact. The systems page is still oversized and should be the next shrink target. [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/app/systems/[type]/page.tsx`](./app/systems/[type]/page.tsx) [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/app/dashboard/user/[userKey]/dashboard-user-client.tsx`](./app/dashboard/user/[userKey]/dashboard-user-client.tsx) [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/components/dashboard-page/overview-tab.tsx`](./components/dashboard-page/overview-tab.tsx) [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/components/dashboard-page/totals-tab.tsx`](./components/dashboard-page/totals-tab.tsx) [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/lib/watchpower.ts`](./lib/watchpower.ts)

14. `delete:` Debug leftovers are still sitting in core dashboard paths, not just one transform. Confirmed examples include `console.log("this is the pv power", pvPowerKw)` in `dashboard-data.ts`, `console.log("this is the inverter details", apiData)` in `overview-tab.tsx`, aggregate payload logging in `dashboard-user-client.tsx`, and systems-page status dumps in `app/systems/[type]/page.tsx`. Replacement: nothing, or gated dev-only tracing. [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/lib/dashboard-data.ts:122`](./lib/dashboard-data.ts) [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/components/dashboard-page/overview-tab.tsx:556`](./components/dashboard-page/overview-tab.tsx) [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/app/dashboard/user/[userKey]/dashboard-user-client.tsx:263`](./app/dashboard/user/[userKey]/dashboard-user-client.tsx) [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/app/systems/[type]/page.tsx:894`](./app/systems/[type]/page.tsx)

15. `yagni:` The dashboard has multiple identity layers for the same inverter payload, but they do not agree on which serial is authoritative. The transform trusted wrapper metadata while the raw WatchPower payload carried its own `SN`, which let wrong-inverter telemetry render under the selected inverter tab. Replacement: one explicit serial source of truth, validated at the transform boundary. [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/utils/transform-inverter-data.ts:11`](./utils/transform-inverter-data.ts) [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/lib/dashboard-bootstrap.ts:62`](./lib/dashboard-bootstrap.ts)

16. `yagni:` Customer grouping currently prefers `alias` over `username`, which means a multi-inverter customer can be split into multiple "user" dashboards just because each inverter has a different alias. Replacement: group by customer identity first (`username`), then use alias only as a display label for a single inverter. [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/utils/user-groups.ts:31`](./utils/user-groups.ts)

17. `shrink:` `ApiData` drifted away from what the transform actually returns. The transform has been carrying `serialNumber` and `raw`, but the shared type did not declare them, which made identity validation and raw-payload inspection feel "extra" instead of first-class. Replacement: keep the shared type aligned with the real payload, or remove fields the UI should never see. [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/components/dashboard-page/types.ts:52`](./components/dashboard-page/types.ts) [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/utils/transform-inverter-data.ts:25`](./utils/transform-inverter-data.ts)

18. `yagni:` The grouped dashboard still creates "fake single inverter" representations in more than one place. `aggregateApiData()` fabricates a unified inverter payload, and `toInverterViewModel()` then wraps that again into a single `InverterData` shape for screens that are not truly single-inverter screens. Replacement: separate aggregate screen props from single-inverter props instead of repeatedly impersonating one inverter. [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/app/dashboard/user/[userKey]/dashboard-user-client.tsx:257`](./app/dashboard/user/[userKey]/dashboard-user-client.tsx) [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/app/dashboard/user/[userKey]/dashboard-user-client.tsx:849`](./app/dashboard/user/[userKey]/dashboard-user-client.tsx)

## First Cuts

If you want the highest-signal simplification order, do this:

1. Delete the verified-unused `components/ui/*` wrappers first, then trim dead deps from `package.json`.
2. Remove `useTelemetrySocket`, `useNavVisibility`, `PowerFlowCards`, dead maintenance code, and the `/home` redirect shell.
3. Keep grouped-dashboard live state on one model: use `apiData` for live numbers, and keep chart derivation local to chart/totals code only.
4. Delete the client-side energy-summary engine from `lib/watchpower.ts` once the backend summary payload is the only source.
5. Unify on one query/data layer instead of keeping both `use-inverter-data` and `dashboard-bootstrap`.
6. Make serial identity explicit and validated once in the transform/bootstrap boundary, then remove downstream defensive workarounds.
7. Rebuild customer grouping around `username` as the grouping key and `alias` as an inverter label.

## Correctness Appendix

These are not just style problems; they are already causing wrong behavior:

1. Wrong inverter telemetry can render on an individual inverter overview because the frontend was trusting the outer bootstrap slot serial more than the raw WatchPower `SN`. This is now partially defended in the Next layer, but the upstream payload is still dirty and should be fixed at source. [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/utils/transform-inverter-data.ts:11`](./utils/transform-inverter-data.ts) [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/lib/dashboard-bootstrap.ts:62`](./lib/dashboard-bootstrap.ts)

2. Combined customer dashboards are modeled incorrectly because grouping uses inverter alias before customer identity. That can split one real customer into multiple dashboard routes and makes aggregate logic harder than it needs to be. [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/utils/user-groups.ts:31`](./utils/user-groups.ts)

3. The Power Overview card bug was a symptom of mixed live data sources, not just a wrong JSX field. That split has now been removed; live overview values come from `apiData`, which is the state the app should keep using for live power. [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/components/dashboard-page/overview-tab.tsx:607`](./components/dashboard-page/overview-tab.tsx) [`/Users/henryjaiyeoba/core/alemdar/alemdar-flow/alemdar-flow/app/dashboard/user/[userKey]/dashboard-user-client.tsx:624`](./app/dashboard/user/[userKey]/dashboard-user-client.tsx)

## Net

net: `-5500` to `-7500` lines, `-15` to `-20` deps possible.
