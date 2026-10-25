# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Everyone in Kohima, Nagaland, who needs stationery: school and college students, parents buying school supplies, and offices and shops restocking paper, registers and office supplies. No single group leads; the design speaks to all of them equally. Almost all use the shop on a phone, often a mid-range Android on mobile data, sometimes outdoors in hilly-town light.

Two staff audiences work inside the same app: the store owner/admin (orders, stock, products, coupons, returns, reports) and delivery partners (accept, navigate, deliver with a code).

## Product Purpose
Gupta Enterprises is one real stationery store at Khedi Market, New NST, opposite Hotel Galaxy, Kohima. The app lets people order from that store's shelves and get it delivered quickly or collect it. Success is a customer finding the item, checking out in under a minute, trusting the price and the delivery time, and coming back.

## Positioning
A neighbourhood shop's actual shelf, not a marketplace: one store, its own stock counts, its own delivery partners on Kohima's hill roads, its owner's phone number. Quick delivery in 45 to 60 minutes within 15 km by road, 2-hour scheduled slots, or free pickup at the counter.

## Operating Context
- Order types: quick delivery, scheduled 2-hour slot, store pickup (with collector's name and mobile).
- Payment: UPI to the store's own UPI ID (verified by UTR), cash on delivery, or pay at the counter.
- Store hours 10:00 to 17:30; deliveries 11:00 to 16:00; quick delivery has a last-order time.
- Delivery addresses are set by dropping a map pin, then house details.
- Live order tracking (timeline, delivery partner on a map), delivery code, returns within 3 days, reviews with photos.
- SuperCoins: 1 coin = ₹1; earn 2% of item value paid; referrals.
- Downloadable order bill (not a GST invoice; GST invoice on request).

## Capabilities and Constraints
- Next.js 15 App Router, React 19, Tailwind v4, framer-motion, Supabase (auth, Postgres with RLS, realtime, storage). Free tiers only. Deployed on Vercel.
- Shop pages are statically generated and served from the CDN; personal parts load in the browser.
- Google sign-in only.
- Must stay fast on mid-range Android phones and slow mobile data: motion must be cheap (transform/opacity), lazy, and respect reduced motion.
- Admin and agent screens are working tools: speed and clarity first.

## Brand Commitments
- Name: Gupta Enterprises (formerly Gupta Ink). Everything else, including logo, palette and type, is open to replacement (confirmed by the owner, Oct 2026).
- The owner asked for a premium, animated feel inspired by Aceternity UI, Skiper UI and Animmaster, with the UI skills' rules winning where they clash: premium through motion, type, layout and real product imagery, no glows, aurora/gradient backgrounds or decorative glass.

## Evidence on Hand
- Real catalogue: product names, variants, prices, stock and generated product illustrations in `public/catalog/`.
- Store facts: address, phone 7905529544, email guptaenterpriseskohima@gmail.com, GSTIN 13CNAPG5572Q1ZP, owner Ashutosh Gupta.
- No real store photographs, customer testimonials, press or sales statistics exist. Do not invent them.

## Product Principles
1. The shelf is the hero: products, prices and stock are always the clearest thing on screen.
2. Speed is part of the promise: every screen shows something useful immediately; motion never delays a task.
3. Local and honest: real store, real times, real totals; no fake urgency or invented proof.
4. Motion explains state: where an order is, what was added, what changed.
5. Staff tools stay calm and dense; delight belongs to customers.

## Accessibility & Inclusion
Readable on small phones in bright light (contrast at least 4.5:1 for text), 44px touch targets, works with reduced motion, keyboard accessible on desktop, English UI with Indian rupee formatting.
