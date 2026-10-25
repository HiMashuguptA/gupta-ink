# Gupta Enterprises

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

## What's built (Phases 0 to 5)

- **Database:** 29 tables with Row Level Security on every one, a sign-up trigger (owner email becomes admin, referral code, wallet), protected owner account, rate limits, audit log, realtime, and five storage buckets (images only, 5 MB max).
- **Brand:** Gupta Enterprises logo (a "G" written as one pen stroke ending in a gold nib), animated version, PWA icons.
- **Customer app:** animated Google sign-in page, 5-second welcome film for new users, referral sheet, location prompt with map pin and 15 km check, home page with admin-controlled carousel and sections, typo-tolerant search with live suggestions, category listings with filters and sorting, product pages with linked variants, cart with fly-to-cart animation, wishlist, account, notifications (live), store-hours notices, skeleton loading.
- **Checkout (Phase 2):** saved addresses with map pin, GPS and road distance from the store (OSRM; outside 15 km means pickup only); quick delivery, scheduled 2-hour slots for the next 7 days, or store pickup; coupons, SuperCoins, pending cancellation fines and the ₹99 minimum all priced by the database, never the browser; UPI, cash on delivery or pay at counter.
- **Orders (Phase 2):** live order page with timeline and celebration, UPI payment by QR code or app link with a 30-minute timer, cancellation with the 3-free-per-week rule and refund UPI ID, order history. Unpaid UPI orders cancel themselves after 30 minutes and uncollected pickups after 48 hours.
- **Delivery partner (Phase 3):** open `/agent` on the Android phone. Online/offline switch, new jobs buzz the phone, accept or decline, one-tap call and Google Maps navigation, "Picked up, start delivery", then the customer's 4-digit code (and a cash tick box for COD) to finish. Five wrong codes lock the order and alert the store. Today's deliveries and cash to hand in are shown at the bottom.
- **Live tracking (Phase 3):** while the partner carries the order, their phone shares its location every 10 seconds and the customer sees them move on a map, plus the delivery code. Location is only visible while the order is on its way.
- **Returns and refunds (Phase 4):** within 3 days of delivery, customers pick items and quantities, choose a reason, add 1 to 5 photos and their UPI ID. Refunds share out coupon and coin savings fairly; delivery fees aren't refunded; items marked non-returnable can't be picked. The store approves or rejects, sends the delivery partner to collect (or the customer brings pickup orders in), marks items received (optionally back in stock), then pays by UPI and uploads the screenshot. The customer sees the screenshot on their order. Refunds for cancelled paid orders use the same screenshot step.
- **SuperCoins (Phase 4):** 2% of what was paid for items (after any refunds), credited automatically once the return window closes and no return is open. Coins last 10 days, oldest used first, with a reminder 2 days before they lapse. The SuperCoins page shows balance, coins on the way, history and referral stats.
- **Referrals (Phase 4):** when a referred friend's first order passes its return window, both people get 50 coins automatically.
- **Reviews (Phase 4):** buyers rate each item (stars, comment, up to 3 photos) from their order page; product ratings update straight away. Admin can hide a review.
- **Coupon builder (Phase 4):** admin creates and edits coupons: percent, flat or free delivery; caps, minimum order, start and end dates, total and per-customer limits, first order only, chosen categories, or chosen customers by email; on/off switch.
- **Reports (Phase 5):** sales, orders, average order and customers with change against the previous period; sales per day (or week), sales by category, busiest hours, delivery and payment mix, best sellers, top customers by spend, coupon and coin cost, refunds and cancellations. Pick 7, 30, 90 days, a year, or any dates. Every chart has a table view.
- **Editors (Phase 5):** Products (search, filter, low stock, quick stock and on/off changes; full editor with variants, prices, GST, HSN, colours and photo upload), Home page (carousel banners and promo tiles with pictures, links, schedule and order; rename, reorder or hide sections), Store settings (pause orders, hours, delivery slots, holidays, fees, limits, coin, cancellation and return rules).
- **My spending (Phase 5):** customers see what they spent, what they saved, the last 6 months and their top categories.
- **Admin:** overview (today's orders and revenue, open orders, refunds to pay, SKUs, low stock, most-searched terms), a live orders board that chimes on new orders, order detail with verify payment, assign delivery partner, move status and cancel, and users and roles.
- **Policies:** privacy, terms, delivery, cancellation and returns pages.

## Next phases

3. Delivery agent portal: accept, live location, emailed delivery OTP.
6. Security tests, deployment to Cloudflare and your domain.

## Project layout

- `src/app/(shop)` customer pages, `src/app/admin` admin, `src/app/agent` agent portal
- `src/components` UI, `src/lib` data access, `src/content/policies.ts` policy text
- `supabase/migrations` database schema (applied to the live project), `supabase/seed.sql` dummy catalogue
- `scripts/generate-catalog.mjs` regenerates the dummy product illustrations and seed data

## Turn on delivery-code emails (free, 10 minutes)

The code always shows on the customer's order page. To also email it:

1. Make a free account at brevo.com (300 emails a day free).
2. In Brevo, **Senders, Domains & Dedicated IPs > Senders**, add and verify guptaenterpriseskohima@gmail.com.
3. **SMTP & API > API Keys**, create a key and copy it.
4. In the Supabase dashboard, open **SQL Editor** and run (paste your key):
   `select vault.create_secret('xkeysib-your-key', 'brevo_api_key');`

That's all. The database sends the email itself, so the key never touches the website.

## Tips for the delivery phone

- Use Chrome. Open `/agent`, tap the menu, **Add to Home screen**.
- Allow location when asked. Keep the app open on screen while delivering; the screen is kept awake automatically, but Android stops sharing location if Chrome is closed.

## How UPI works for now

Until YouPI is installed on the store PC, customers pay your UPI ID (himanshugupta123456@ybl) by scanning the QR code or tapping "Open UPI app", with the order number as the note. They then enter the 12-digit UTR. The order shows under **Awaiting UPI** or **Needs action** on the admin board; check your bank app, then press **Payment received, confirm order**. Phase 6 replaces this with YouPI's automatic confirmation.

## Live updates and speed

- Screens update by themselves: the admin panel (orders, payments, returns, reviews, stock), the customer's orders, order page, coins, spending and the notification bell, the delivery partner's jobs, and product pages (new reviews, stock). If the live connection drops, pages re-check when you come back to the tab and every 45 seconds.
- The shop catalogue is cached for speed and refreshed the moment an admin edits something, an order is placed or cancelled, items are restocked, or a review is added or hidden.
- Each page makes one database call to identify the signed-in person (no separate call to the sign-in server).
- Ordering empties the cart in the database in the same step as the order, so it stays empty on every device.

## Put it online for testing (Vercel, free)

1. Sign in at vercel.com with GitHub (Hobby plan is free). **Add New > Project**, import the `gupta-ink` repository. Framework: Next.js (detected).
2. Before **Deploy**, open **Environment Variables** and add the five values from your `.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DISTANCE_SIGNING_KEY`, `OSRM_URL`, and `NEXT_PUBLIC_SITE_URL` (set it to the Vercel address, for example `https://gupta-ink.vercel.app`).
3. Click **Deploy**. Every push to `main` redeploys by itself.
4. So Google sign-in works on the new address: Supabase dashboard > **Authentication > URL Configuration**, add `https://YOUR-APP.vercel.app/auth/callback` to Redirect URLs (keep the localhost one).

Never add the service-role key or the database password to Vercel or GitHub.

## Notes

- Road distance uses the free public OSRM server (`OSRM_URL`). If it's down, the app falls back to straight-line distance × 1.4 and marks it approximate. The result is signed with `DISTANCE_SIGNING_KEY`, which must match the `distance_hmac` secret in Supabase Vault, so customers can't fake their distance.

- The Supabase project is in the Sydney region, not Mumbai. The privacy policy says so. Moving to Mumbai means creating a new project and re-running the migrations.
- Reset the database password in Supabase (Project Settings > Database), since it was shared in chat. The app doesn't use it.
- Never put the service-role key in a `NEXT_PUBLIC_` variable.
