# Gupta Ink

Quick-commerce stationery app for Gupta Enterprises, Khedi Market, Kohima.
Next.js 15 + Supabase (free tier). Customer app, admin panel and delivery agent portal in one codebase.

## Run it locally

You need Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

**Speed note:** `npm run dev` compiles each page the first time you open it, so first visits are slow in development. To feel the real speed customers will get, run the production version:

```bash
npm run build
npm start
```

Every page load also talks to Supabase in Sydney. Moving the project to the Mumbai region would cut that delay by roughly two thirds (see Notes). The `.env.local` file already points at the GuptaEnterprises Supabase project, and the dummy catalogue (35 products, 48 variants, 10 categories, 3 coupons) is loaded.

## One-time setup: Google sign-in

Sign-in won't work until Google is switched on in Supabase (about 10 minutes, free):

1. In Google Cloud Console, create a project, then **APIs & Services > Credentials > Create credentials > OAuth client ID**, type **Web application**.
2. Under **Authorised redirect URIs** add: `https://tctsibxbatywwzqoaweu.supabase.co/auth/v1/callback`
3. Copy the Client ID and Client secret.
4. In the Supabase dashboard: **Authentication > Sign In / Providers > Google**, turn it on and paste both values.
5. In **Authentication > URL Configuration**, set Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs. Add your real domain the same way when you launch.

The first time premiumservice9366@gmail.com signs in, it becomes admin automatically.
To make the delivery agent: they sign in once, then the admin opens **Account > Open admin panel > Users and roles** and sets their role to "Delivery agent".

## What's built (Phases 0 and 1)

- **Database:** 29 tables with Row Level Security on every one, a sign-up trigger (owner email becomes admin, referral code, wallet), protected owner account, rate limits, audit log, realtime, and five storage buckets (images only, 5 MB max).
- **Brand:** Gupta Ink logo (a "G" written as one pen stroke ending in a gold nib), animated version, PWA icons.
- **Customer app:** animated Google sign-in page, 5-second welcome film for new users, referral sheet, location prompt with map pin and 15 km check, home page with admin-controlled carousel and sections, typo-tolerant search with live suggestions, category listings with filters and sorting, product pages with linked variants, cart with fly-to-cart animation, wishlist, account, notifications (live), store-hours notices, skeleton loading.
- **Admin:** overview (SKUs, low stock, most-searched terms) and users and roles.
- **Policies:** privacy, terms, delivery, cancellation and returns pages.

## Next phases

2. Checkout: addresses, road-distance check (OSRM), quick/scheduled/pickup, slots, coupons, SuperCoins, fines, COD and YouPI UPI, live order status.
3. Delivery agent portal: accept, live location, emailed delivery OTP.
4. Returns and refunds, SuperCoin crediting and expiry, referral rewards, reviews, coupon builder.
5. Admin dashboards and charts, product and carousel editors, spend analysis.
6. Security tests, deployment to Cloudflare and your domain.

## Project layout

- `src/app/(shop)` customer pages, `src/app/admin` admin, `src/app/agent` agent portal
- `src/components` UI, `src/lib` data access, `src/content/policies.ts` policy text
- `supabase/migrations` database schema (applied to the live project), `supabase/seed.sql` dummy catalogue
- `scripts/generate-catalog.mjs` regenerates the dummy product illustrations and seed data

## Notes

- The Supabase project is in the Sydney region, not Mumbai. The privacy policy says so. Moving to Mumbai means creating a new project and re-running the migrations.
- Reset the database password in Supabase (Project Settings > Database), since it was shared in chat. The app doesn't use it.
- Never put the service-role key in a `NEXT_PUBLIC_` variable.
