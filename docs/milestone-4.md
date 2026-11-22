# Milestone 4: Google Authentication and Cloud Hosting

## Purpose

Add Google sign-in to the Tools application, persist Better Auth users and sessions in Neon Postgres through Drizzle ORM, keep development and production databases separate, and prepare the Next.js application for Cloudflare hosting.

This file is the implementation brief for Milestone 4. **Review and agree on this plan before implementation begins.**

## Product decisions

- Use **Google as the only authentication provider**.
- The sign-in entry point is an accessible authentication dialog, not a dedicated sign-in page. The dialog contains one **Continue with Google** action. Selecting it starts Better Auth's Google OAuth flow; on successful return, the dialog closes and the user returns to the page they were using.
- When signed out, the app header provides a sign-in action that opens the dialog. When signed in, it shows the user's Google profile identity and a sign-out action.
- Store user, session, OAuth account, and verification records in Postgres using Better Auth's Drizzle adapter.
- Create two separate Neon projects: one for local development and one for production. Never point local development at production or share credentials between them.
- Use Resend, email OTP, password authentication, GitHub authentication, and other social providers **nowhere in this milestone**.
- Generate separate Better Auth secrets for development and production. Set the local auth URL to `http://localhost:3000`; set the production auth URL to the final Cloudflare hostname.
- Proposed guest access for review: keep the tools directory public and require sign-in before entering tool routes. After Google sign-in, return the visitor to the route they originally selected. Confirm or change this access rule before implementation.
- Authentication is for identity and sessions only. Existing tools' browser-local files, projects, and editor state remain local and are not uploaded or associated with an account in this milestone.

## Existing project context

- The repository is a Next.js App Router application using TypeScript, React, Tailwind CSS, shadcn/ui components, light and dark themes, and a typed tool registry.
- Authentication infrastructure belongs in focused shared modules such as `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/db/schema.ts`, and `src/db/index.ts`. Keep the auth API route thin and keep feature-specific editor logic independent of auth persistence.
- The project has pre-existing, uncommitted GIF Maker work. Preserve all unrelated edits and include only Milestone 4 files in its commits.
- The project's primary package manager is pnpm. Read the installed Next.js documentation and current integration guidance before implementation; the checked-in app and installed package versions are authoritative.
- Follow `AGENTS.md` for code organization, semantic design tokens, responsive UI, accessibility, and coherent commits.

## Authentication dialog and user flow

1. A signed-out visitor selects **Sign in** in the header or attempts to open a protected tool.
2. An accessible dialog opens with concise context and one **Continue with Google** button.
3. Selecting the button starts Google OAuth through Better Auth. The user completes consent on Google's page and returns to the original app location.
4. Better Auth creates or retrieves the user and account, persists a session, and sets its secure session cookie.
5. The dialog is replaced by the signed-in header state. If the visitor was headed to a protected tool, continue to that tool.
6. The user can sign out from the header; Better Auth invalidates the session and the app returns to its signed-out state.

The dialog must support keyboard operation, visible focus, correct focus handling, an accessible title and description, pending feedback, and clear OAuth failure/retry feedback. Do not add an email entry or OTP view.

## Scope

### Better Auth and Google OAuth

- Add Better Auth and configure only the Google social provider.
- Mount the Better Auth handler at `/api/auth/[...all]` using the current Next.js App Router integration.
- Add a typed client helper for initiating Google sign-in, reading session state, and signing out.
- Request only the identity/profile scopes needed by the product. Treat the email returned by Google as user identity data; do not use it to send application email in this milestone.
- Configure the Google OAuth consent screen and authorized origins/redirect URI for local development and the production Cloudflare hostname.
- Use the Better Auth session API for authoritative server-side checks. Client UI state may reflect the session but must not be used as the only authorization check.
- Define the guest-access policy from the product decision above. Protect the chosen tool routes on the server and preserve a safe post-login return path; do not trust arbitrary redirect URLs supplied by a request.
- Add sign-out behavior and appropriate session-aware header states.

### Drizzle and Neon Postgres

- Add Drizzle ORM, the Neon serverless driver, Better Auth's Drizzle adapter, and Drizzle Kit for schema migrations.
- Define the schema required by the installed Better Auth version and Google OAuth flow: user, session, account, and verification tables, including required indexes, unique constraints, and foreign keys.
- Keep the Drizzle schema as the source of truth and use committed SQL migrations. Do not use ad hoc production schema mutations.
- Create isolated Neon projects named clearly for development and production. Use an appropriate region for the deployment and expected users, and record each project's purpose without checking connection strings into Git.
- Configure local `DATABASE_URL` to use only the development Neon project. Configure production `DATABASE_URL` as a Cloudflare secret pointing only to the production Neon project.
- Apply and verify migrations against development first. Apply production migrations as a separate, deliberate deployment step after the schema is reviewed.
- Use Neon-compatible HTTP queries for the serverless/Worker runtime where suitable. Confirm Better Auth's adapter requirements and transaction needs before locking the driver configuration.

### Secrets and configuration

Add a committed `.env.example` containing variable names and safe placeholders only. Keep actual values in ignored local environment files and Cloudflare secret storage.

| Variable | Development | Production |
|---|---|---|
| `DATABASE_URL` | Dev Neon connection string | Prod Neon connection string in Cloudflare secrets |
| `BETTER_AUTH_SECRET` | Unique generated local secret | Separate unique generated Cloudflare secret |
| `BETTER_AUTH_URL` | `http://localhost:3000` | Final Cloudflare app origin |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Same OAuth client or environment-specific client, depending on consent-screen setup |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Stored as a Cloudflare secret |

- Never commit `.env.local`, production secrets, OAuth secrets, Neon connection strings, or generated credentials.
- The Better Auth secret and local auth URL can be generated/configured by the implementer. Production auth URL must match the deployed Cloudflare origin.
- Google OAuth must have the local origin and the final production callback registered. With the standard Better Auth base path, the callbacks are `/api/auth/callback/google` on each origin.
- A Neon API key is an optional provisioning credential only; it is not an application runtime variable. If Neon project creation cannot be completed with the signed-in console session, obtain account access or a provisioning credential before claiming that both projects exist.

### Cloudflare hosting

- Confirm the supported Cloudflare deployment path for this repository's installed Next.js version and used features before changing build configuration. Evaluate Cloudflare's currently supported Next.js adapter options (including vinext and OpenNext) against the existing app; record the selected path and any compatibility changes here.
- Add only the required Wrangler/adapter configuration and scripts. Preserve the local `pnpm dev` workflow.
- Configure production runtime secrets in Cloudflare, including the production Neon connection string, production Better Auth secret, Google OAuth credentials, and production `BETTER_AUTH_URL`.
- Set Google OAuth production origins and callback URLs to the final Worker/custom domain. Confirm secure cookies, forwarded host/protocol handling, and OAuth redirects on the deployed origin.
- Document build, local Cloudflare preview, and deployment commands. Do not publish or deploy production until credentials, domain, database, and migration are configured.

## Suggested file organization

```text
src/
  app/
    api/auth/[...all]/route.ts       # Thin Better Auth route handler
  components/
    auth-dialog.tsx                  # Google-only sign-in dialog
    app-header.tsx                   # Signed-out and signed-in states
  db/
    index.ts                         # Typed Neon + Drizzle client
    schema.ts                        # Better Auth persistence schema
  lib/
    auth.ts                          # Better Auth server configuration
    auth-client.ts                   # Browser auth client
    auth-session.ts                  # Shared server session helpers
drizzle/                             # Versioned SQL migrations
drizzle.config.ts
.env.example
wrangler.jsonc                       # Or current Cloudflare config format
```

Adapt names to current project conventions while keeping route code thin and auth/database boundaries typed.

## Implementation phases

### Phase 0 — Compatibility and access review

**Goal:** Resolve implementation prerequisites before introducing auth or deployment assumptions.

- Review the repository, current user changes, installed Next.js documentation, package scripts, UI components, and current Cloudflare/Better Auth integration requirements.
- Confirm the guest-access rule for the directory and tool routes.
- Confirm access to a Neon account for creating two projects and determine the intended production Cloudflare hostname or temporary Worker hostname.
- Register a Google OAuth client for local and production origins/callbacks, or record the exact credentials and callback setup still needed from the user.
- Compare Cloudflare deployment options against the app's existing Next.js features; document the choice and any compatibility gaps.

**Checkpoint:** Authentication scope, Neon access, OAuth callback origins, and Cloudflare deployment path are clear.

### Phase 1 — Auth and database foundation

**Goal:** Establish schema, server database access, and Better Auth configuration.

- Add the required dependencies using pnpm and create focused database and auth modules.
- Define the Better Auth schema with Drizzle and add Drizzle Kit configuration and migration scripts.
- Provision the development and production Neon projects, keeping their credentials separate.
- Add the environment example and local ignored environment file; generate a development auth secret and configure the local auth URL.
- Create and apply the initial migration to development, then verify Better Auth can use the database.

**Checkpoint:** Local server configuration can connect to the development database and the auth schema is versioned in the repository.

### Phase 2 — Google OAuth and dialog flow

**Goal:** Deliver a working Google-only authentication experience.

- Configure Google OAuth and Better Auth's Next.js handler/client.
- Add the header sign-in action and accessible authentication dialog with one Google action.
- Add signed-in profile and sign-out UI, pending/error states, and session-aware rendering.
- Implement the reviewed route-access policy and safe post-login return behavior.
- Confirm new and returning Google identities persist users/accounts and that sessions persist across page navigation and reload.

**Checkpoint:** A user can sign in with Google, return to the intended page, retain a session, and sign out; no other provider or email flow is present.

### Phase 3 — Cloudflare and production configuration

**Goal:** Prepare a reproducible Cloudflare deployment with production data isolated from development.

- Implement the selected Cloudflare Next.js adapter and preserve local development behavior.
- Configure Worker bindings/secrets for the production database, Better Auth, Google OAuth, and public origin.
- Register the final Google OAuth production origin and callback.
- Apply the reviewed migration to the production Neon database as a separate deployment operation.
- Add documented local preview and deployment commands. Deploy only when all production credentials and domain settings are available.

**Checkpoint:** The production configuration points only to the production Neon project and completes Google OAuth on the Cloudflare origin.

### Phase 4 — Review and handoff

**Goal:** Review user-facing behavior, persistence boundaries, and operational setup.

- Review signed-out and signed-in states, dialog keyboard/focus behavior, OAuth success/failure, sign-out, protected-route behavior, and safe return navigation.
- Confirm development and production use separate Neon projects and separate Better Auth secrets.
- Confirm migrations are reproducible, secrets are ignored locally/not committed, and production credentials are stored in Cloudflare.
- Run the requested repository checks only when authorized; do not add or run tests unless requested.
- Update the README and this milestone with the actual Cloudflare adapter, environment setup, OAuth callback URLs, migration/deployment steps, and any known limitations.
- Record completed work and present the integrated experience for review.

**Checkpoint:** Google authentication and database persistence are correctly configured for local development and Cloudflare production, with setup and known limitations documented.

## Definition of done

- Google is the only authentication provider and the UI has one Google sign-in action in an accessible dialog.
- Better Auth persists users, OAuth accounts, sessions, and verification data in Neon through Drizzle.
- Separate development and production Neon projects are provisioned and configured without sharing connection strings.
- Local development uses a generated development auth secret and `http://localhost:3000`; production has a separate secret and the deployed Cloudflare origin.
- The reviewed guest-access policy is enforced server-side and successful OAuth returns users to their intended in-app destination.
- The user can sign out and the session state updates correctly.
- The selected Cloudflare deployment path is compatible with this app and is documented.
- No GitHub authentication, email OTP, password login, or Resend integration is included.
- Existing browser-local tool data and unrelated user changes are preserved.

## Risks and decisions for review

- **Route access policy:** Proposed default is a public directory with tool routes requiring Google sign-in. Decide whether to gate all tools, selected routes, or authentication only where needed.
- **Google OAuth setup:** Google client credentials and authorized origins/callbacks must be configured for both local and production origins. Production callback setup depends on the final Worker/custom domain.
- **Neon account access:** Two projects cannot be created until the Neon console is signed in or an appropriate provisioning credential is available.
- **Cloudflare compatibility:** The project uses Next.js 16 and existing Next-specific features. The deployment adapter must be chosen only after compatibility checks.
- **OAuth account behavior:** Define how an existing account is handled if the same Google identity/email is encountered after provider or account changes. Since Google is the sole provider in this milestone, do not add broad automatic account-linking behavior without a clear need.
- **Session and cookie settings:** Production origin, secure cookies, and proxy headers must match Cloudflare's runtime behavior or OAuth/session callbacks can fail.
- **Production migration safety:** Apply schema changes to production only after they are reviewed and verified on development.

