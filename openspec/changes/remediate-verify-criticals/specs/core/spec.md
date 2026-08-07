# Delta for DiretorioPeruano – remediate-verify-criticals

## Data Model Changes

### Requirement: BusinessProfile must store optional KYC data
The system **MUST** include optional fields `cnpj`, `ownerFullName`, and `ownerBirthCity` on `BusinessProfile`. These fields **MAY** be null until the business is approved.

#### Scenario: Happy Path
- **GIVEN** the updated Prisma schema is migrated,
- **WHEN** a new business is created, 
- **THEN** the returned record contains the KYC fields.

#### Scenario: Validation Error
- **GIVEN** the schema exists, 
- **WHEN** attempting to create a business without required mandatory fields (e.g., name or address), 
- **THEN** the API responds **400** and KYC fields are not persisted.

### Requirement: Prisma client generation must be part of the build
The Netlify build pipeline **MUST** run `npx prisma generate` after dependencies are installed and before `npm run build`.

#### Scenario: Successful Generation
- **GIVEN** `netlify.toml` contains `prisma generate` after the install step,
- **WHEN** the site is built,
- **THEN** `node_modules/.prisma/client` exists and is importable.

#### Scenario: Build Failure
- **GIVEN** the generation step is missing,
- **WHEN** building, the pipeline fails due to missing client exports.

## API Contracts (Netlify Functions)

### Requirement: Review status defaults to APPROVED
The Review model **MUST** default to `APPROVED` when the status field is omitted.

#### Scenario
- **GIVEN** a POST `/api/reviews` without status,
- **WHEN** the review is created,
- **THEN** the returned review status is `APPROVED`.

### Requirement: POST `/api/businesses` accepts KYC data and validates CNPJ
The `POST /api/businesses` endpoint **MUST** accept `cnpj`, `ownerFullName`, `ownerBirthCity` in its JSON body and invoke `validateCNPJ`/`lookupCNPJ`.

#### Scenario
- **GIVEN** a POST with valid CNPJ, 
- **WHEN** the request is processed,
- **THEN** the business is created with KYC fields persisted.

#### Scenario
- **GIVEN** a POST with invalid CNPJ,
- **WHEN** validated, the API responds **400**.

### Requirement: Search endpoint supports minRating
The `GET /api/businesses` endpoint **MUST** accept a `minRating` query parameter and filter results by `rating >= minRating`.

#### Scenario
- **GIVEN** GET `/api/businesses?minRating=4`, 
- **WHEN** handled, the response contains only businesses with rating ≥ 4.

#### Scenario
- **GIVEN** a request with an unknown `rating` param, 
- **THEN** it is ignored and no error returned.

### Requirement: Stripe webhook must set disabled status and timestamp
Upon receiving `customer.subscription.deleted` or a canceled `customer.subscription.updated` event, the webhook endpoint **MUST** set `BusinessProfile.status = DISABLED` and `disabledAt` to the current timestamp.

#### Scenario
- **GIVEN** a valid Stripe event, 
- **WHEN** the webhook processes it, 
- **THEN** the business profile is updated to `DISABLED` and `disabledAt` is set.

#### Scenario
- **GIVEN** an event with invalid signature, 
- **WHEN** received, 
- **THEN** the endpoint responds **400**.

### Requirement: Stripe portal must enforce ownership or superadmin auth
The `/api/stripe/portal` endpoint **MUST** verify that the requester is either the owner of the business or has a superadmin role before creating a portal session.

#### Scenario
- **GIVEN** a Clerk token of the business owner, 
- **WHEN** the portal request is made, 
- **THEN** a portal session is returned.

#### Scenario
- **GIVEN** a Clerk token of a non‑owner unauthenticated request, 
- **WHEN** attempted, 
- **THEN** the API responds **403**.

### Requirement: Stripe subscription ID mapping
The system **MUST** store the Stripe subscription id in the `subscriptionId` field of `BusinessProfile` and keep it in sync with the Stripe subscription lifecycle.

#### Scenario
- **GIVEN** an approved business and a Stripe subscription is created, 
- **WHEN** the subscription ID is stored, 
- **THEN** subsequent status updates reflect the same ID.

#### Scenario
- **GIVEN** the subscription is cancelled on Stripe, 
- **WHEN** processed, 
- **THEN** the local field is updated accordingly.

### Requirement: Disabled business UX
When a business status is `DISABLED`, the MeuNegocio page **MUST** render a read‑only UI, display a banner notifying the owner to update payment, and provide a link to the Stripe customer portal.

#### Scenario
- **GIVEN** a disabled business, 
- **WHEN** the owner visits MeuNegocio, 
- **THEN** only read‑only controls are shown and the banner appears.

#### Scenario
- **GIVEN** a non‑owner accesses the page, 
- **WHEN** attempted, 
- **THEN** access is denied with **403**.

### Requirement: Type‑check gate
The CI pipeline **MUST** execute `npx tsc --noEmit` and fail the build on any type errors.

#### Scenario
- **GIVEN** all source files type‑checked, 
- **WHEN** CI runs, 
- **THEN** exit status is **0**.

#### Scenario
- **GIVEN** type errors exist, 
- **WHEN** CI runs, 
- **THEN** the build fails and merges are blocked.

### Requirement: Webhook idempotency via PostgreSQL
The project **MUST** persist Stripe event IDs in a `WebhookEvent` table to ensure idempotent processing. **Redis is explicitly NOT used**.

#### Scenario
- **GIVEN** the same Stripe event ID received twice, 
- **WHEN** processed, 
- **THEN** the second attempt is ignored and the original result remains.

#### Scenario
- **GIVEN** first event processed successfully, 
- **THEN** subsequent duplicates do not affect the business profile.

