# Implementation Plan

## Submission Strategy

The build prioritizes one complete, demonstrable workflow over disconnected
feature breadth. The core demo must work from AI goal through simulated purchase
and updated analytics.

## Phase 1: Foundation

- npm workspace monorepo and shared TypeScript configuration
- Docker Compose PostgreSQL
- Prisma schema, migration workflow, and deterministic seed
- Shared Zod contracts and score utilities

## Phase 2: CRM Intelligence

- Dashboard and shopper queries
- Fatigue and opportunity engines with explanations
- Gemini structured campaign planning with fallback
- Segment preview, campaign approval, and launch
- Idempotent event callback ingestion and analytics

## Phase 3: Channel Service

- Durable queue claims
- Channel-aware lifecycle simulation
- Signed callbacks
- Exponential retries, failure injection, and event logs

## Phase 4: Product Experience

- Premium application shell and navigation
- AI Command Center as the default route
- Dashboard with executive insight feed
- Campaign and shopper intelligence pages
- Analytics funnel, attribution, and channel charts
- Responsive states, loading skeletons, errors, and subtle motion

## Phase 5: Submission Hardening

- Unit tests for score calculation and callback idempotency
- API smoke tests
- production builds for all workspaces
- complete README, environment reference, and deployment instructions
- seeded demo script and short evaluator walkthrough

## Acceptance Scenario

1. Start PostgreSQL and seed the dataset.
2. Open Xeno Genie and enter “Bring back inactive customers.”
3. Review Gemini's explainable plan and fatigue-protected audience.
4. Approve and launch the campaign.
5. Observe simulator events progress through the funnel.
6. See dashboard metrics and campaign analytics update.
7. Open a shopper profile to inspect orders, events, and score reasoning.

