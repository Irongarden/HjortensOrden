# Rebuild-spec for Hjortens Orden

Dette dokument beskriver krav og beslutninger for at bygge websitet på ny med fokus på:
- Funktionalitet (stabil drift og korrekt adfærd)
- Sikkerhed (auth, adgangskontrol, data- og hemmelighedshåndtering)
- Effektivitet (performance, udviklerflow, drift og observability)

## 1. Mål og Principper

### 1.1 Primære mål
- Levere en stabil medlemsplatform med login, roller, events, galleri, afstemninger, kasserer og admin.
- Sikre at data kun er tilgængelig for autoriserede brugere (RLS + server-side checks).
- Reducere fejl ved refresh/hydration/session-håndtering.
- Etablere tydelig og reproducerbar lokal/CI/produktion setup.

### 1.2 Arkitektur-principper
- Single source of truth for auth-state.
- Server-side authorization for alle skrive-operationer.
- Mindst mulige privilegier (principle of least privilege).
- Type-sikker DB adgang (regenererede Supabase typer).
- Fail fast med tydelige fejlbeskeder ved manglende miljøvariabler.

## 2. Funktionelle Krav (MVP + Kerneflow)

### 2.1 Auth og session
- Login med password og OTP.
- Logout på alle relevante views.
- Session refresh uden blank side/hydration-problemer.
- Redirect-regler:
- Ikke-auth bruger -> /login
- Auth bruger på auth-sider -> /dashboard
- Pending/suspended/deactivated håndteres entydigt

### 2.2 Medlems- og rollemodel
- Roller: admin, chairman, vice_chairman, treasurer, librarian, member.
- Rollebaserede menupunkter og handlinger.
- Server-side validering af rollekrav på alle API-ruter.

### 2.3 Domænemoduler
- Dashboard: overblikskort, notifikationer, seneste aktivitet.
- Events: CRUD, RSVP, statusflow (draft/published/completed/cancelled), notifikationer.
- Polls: opret, stem, luk, vis resultater.
- Gallery: albums, upload, visning.
- Treasury: transaktioner, betalinger, påmindelser, forecast.
- Inspiration/workshop: forslag, samarbejdsfelter, opfølgning.
- Timeline: visning + opret/rediger/slet med rollebegrænsning.

### 2.4 Robusthed i UI
- Ingen blank side ved refresh.
- Definerede loading/empty/error states på alle hovedsider.
- Graceful fallback hvis enkelte data-kald fejler.

## 3. Ikke-funktionelle Krav

### 3.1 Performance
- Lighthouse mål (produktion):
- Performance >= 85
- Accessibility >= 90
- Best Practices >= 90
- SEO >= 85
- Begræns client-only rendering til hvor det er nødvendigt.
- Lazy load tunge komponenter (kort, editor, store lister).

### 3.2 Tilgængelighed
- Tastaturnavigation på primære flows.
- Korrekte labels, aria-attributter og alt-tekster.
- Kontrastkrav for tekst og CTA’er.

### 3.3 Driftbarhed
- Struktureret logging på API-lag.
- Fejlsporing i prod (fx Sentry).
- Health checks og monitorering af kritiske endpoints.

## 4. Sikkerhedskrav (Obligatoriske)

### 4.1 Miljøvariabler og hemmeligheder
- Brug kun `.env.local` lokalt, aldrig commit af secrets.
- Krævede variabler:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_APP_URL
- OPENAI_API_KEY (hvis AI features aktiveret)
- Startup validerer at nødvendige env vars findes; ellers tydelig fejl.

### 4.2 AuthN/AuthZ
- Supabase Auth som identity provider.
- RLS policies på alle tabeller med brugerdata.
- Service role key må kun bruges server-side i kontrollerede API-ruter.
- Ingen klientkald med service role.
- Route handlers skal altid verificere caller + rolle for mutations.

### 4.3 Inputvalidering
- Zod schema på alle write endpoints.
- Whitelist af tilladte felter i PATCH/PUT.
- Sanitization af fritekst før lagring/visning.

### 4.4 API og transport
- HTTPS i produktion.
- CSRF-risici vurderes på session-baserede flows.
- Rate limit på følsomme endpoints:
- login/OTP
- invite/public endpoints
- email/notification endpoints

### 4.5 Audit og sporbarhed
- Log mutationer i audit_log (hvem, hvad, hvornår).
- Fejl med korrelations-id for hurtig debug.

## 5. Effektivitetskrav (Kode, Data, Drift)

### 5.1 Kode-struktur
- Delte auth/role utilities i ét lag (`app/api/_lib/auth.ts`).
- Undgå duplikeret rollelogik på tværs af routes.
- Minimér `any`; regenerer DB typer ved schemaændringer.

### 5.2 Dataadgang
- React Query til cache, invalidation og retry.
- Konsistente query keys pr. domæne.
- Paralleliser uafhængige DB calls med `Promise.all`.
- Håndter fejl eksplicit på alle writes.
- Undgå over-fetching: hent kun nødvendige felter i `select`.
- Undgå N+1 queries: brug joins/RPC hvor det giver mening.
- Indfør deduping af identiske requests i samme render-cyklus.

### 5.2.1 Cache-politik pr. dataklasse
- Definér standardprofiler:
- `cold` data (sjældent ændret): lang `staleTime`, lav refetch-frekvens.
- `warm` data (ændres jævnligt): medium `staleTime`, baggrundsopdatering ved fokus.
- `hot` data (kritisk/live): kort `staleTime`, målrettet polling eller realtime.
- Krav: hver query skal have en dokumenteret cacheprofil.

### 5.2.2 Invalidation-regler
- Invalidate kun berørte query keys efter mutation (ingen global invalidate).
- Brug optimistic updates hvor brugeroplevelsen forbedres og rollback er mulig.
- Efter succesfuld mutation: opdater cache lokalt først, refetch i baggrunden.

### 5.2.3 Baggrundsopdatering
- Sider skal vise cachet data straks og opdatere i baggrunden.
- Undgå hard-loading spinners når brugbar cache findes.
- Refetch-on-focus aktiveres kun på udvalgte `warm/hot` queries.
- Ved offline/netværksfejl: behold sidste gyldige data + tydelig statusindikator.

### 5.2.4 DB-kald budgetter (styringsmål)
- Dashboard route: max 3 primære data-kald før render.
- Detail-sider: max 2 primære data-kald + evt. 1 sekundært baggrundskald.
- Ingen duplicate kald for samme query key indenfor 5 sekunder.
- Mål: 40-80% færre unødige DB-kald mod nuværende baseline.

### 5.3 Build og CI
- Kør altid i CI:
- `npm run type-check`
- `npm run lint`
- tests (unit + integration + e2e smoke)
- Block merge ved type/lint/test-fejl.

### 5.4 Caching og offline
- Ingen legacy service-worker rester medmindre PWA er et aktivt krav.
- Hvis PWA ønskes: versioneret SW-strategi + rollback-plan.
- Hvis ingen PWA: service worker skal være deaktiveret og caches ryddes kontrolleret.
- Definér cache ownership: browser cache vs query cache vs edge cache.

## 6. Datamodel og Migrationer

### 6.1 Migration-strategi
- Én migration pr. ændring, med klar rollback-plan.
- Schemaændringer versioneres i repo.
- Seed-data for lokal udvikling.

### 6.2 Typeregeneration
- Kør DB type generation efter migrationer.
- Build må fejle hvis typer ikke matcher schema.

## 7. Kvalitetssikring og Teststrategi

### 7.1 Testniveauer
- Unit tests: utils, auth/role checks, validering.
- Integration tests: API-ruter med auth + role checks.
- E2E tests: login, dashboard refresh, event CRUD, treasury write flows.

### 7.2 Kritiske regressionstests
- Refresh på dashboard må ikke give blank side.
- CSS skal være indlæst på alle route groups.
- Middleware må ikke gate statiske assets.
- Auth-state race conditions ved reload/token refresh.

## 8. Implementeringsplan (Faser)

### Fase 1: Stabil baseline
- Ryd op i env setup og startup-validering.
- Konsolider auth/role helpers.
- Fiks kendte refresh/hydration problemer.
- Få type-check + lint grøn.

### Fase 2: Security hardening
- Zod validering på alle mutations.
- Audit logging på kritiske endpoints.
- Rate limiting + brute force beskyttelse.

### Fase 3: Performance og DX
- Profilering af tunge sider.
- Reducer client-only rendering hvor muligt.
- Bedre observability og fejlsporing.

### Fase 4: Test og release
- E2E smoke suite.
- Release checklist.
- Staged rollout + monitorering.

## 9. Definition of Done (DoD)

Løsningen er klar når:
- Alle kerneflows virker i lokal, staging og produktion.
- Type-check og lint er grønne uden errors.
- Kritiske E2E flows er grønne.
- Ingen kendte auth/refresh regressions.
- Sikkerhedskrav i afsnit 4 er implementeret og verificeret.
- Cache- og DB-KPI’er er dokumenteret og opfyldt:
- >=40% reduktion i unødige DB-kald på kerneflows.
- Ingen kritiske sider må vise blank state ved baggrundsrefetch.
- P95 dataload for dashboard under 1.5s på staging-data.

## 11. KPI og Måling (Cache/DB)
- Før/efter baseline måles på:
- Antal DB-kald per sidevisning (dashboard, events, treasury, members).
- Duplicate query-rate (samme key gentaget unødigt).
- Cache hit-rate i klienten.
- P50/P95 data-load tid per hovedside.
- Måling implementeres med:
- Instrumentering i API-lag (request-id, endpoint, varighed).
- Query-level telemetry (key, cache-hit/miss, refetch-årsag).
- Ugentlig rapport i udviklingsfasen indtil KPI’er er stabile.

## 10. Praktisk Checklist før ny build-start
- Udfyld rigtige værdier i `.env.local`.
- Verificér Supabase URL + anon key + service role key.
- Start app: `npm run dev`.
- Verificér login + dashboard refresh + API writes.
- Kør: `npm run type-check && npm run lint`.

---

Hvis ønsket kan dette dokument udvides med:
- Konkrete user stories med acceptkriterier
- Teknisk taskboard (estimat og prioritet)
- Trusselsmodel (STRIDE) pr. endpointgruppe
