---
name: Multi-category businesses and subscriptions
description: Businesses support multiple categories, services have interval options, customers have dashboard with subscriptions
type: feature
---
- Businesses can have multiple categories (stored in `categories text[]` column, `category` kept for backwards compat)
- Services have `interval_options text[]` — e.g. engangskøb, ugentlig, hver_14_dag, månedlig, kvartalsvis
- `subscriptions` table tracks customer services with status (active/paused/cancelled)
- `profiles` table auto-created on signup via trigger
- Customer dashboard at `/dashboard` — view/pause/cancel/review subscriptions
- Auth page at `/auth` has mode selector: customer vs business
- Cart renamed to "Bestilling" with business logo, step details, interval info
- Reviews can link to customer_id and subscription_id
