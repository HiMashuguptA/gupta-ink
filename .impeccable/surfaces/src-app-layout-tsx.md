---
version: 1
slug: "src-app-layout-tsx"
primary_target: "src/app/layout.tsx"
related_targets: []
---

# Surface brief: Gupta Enterprises shop app (all customer, admin and agent screens)

Scope: complete redesign of every route. Visitor mode: Operate (shopping, checkout, tracking, staff tools). Home keeps Operate rules with more motion.
Audience: everyone in Kohima on a phone (students, parents, offices), plus the owner and delivery partners.
Job: find an item, add it, check out in under a minute, follow the order; staff run the store.
Constraints: Next.js 15 static shop pages, mid-range Android, reduced motion, owner asked for premium motion (Aceternity / Skiper / Animmaster ideas) with UI-skill rules winning: no glows, aurora/gradient backgrounds, decorative glass.
Memorable moment: the hanging OPEN/CLOSED shop sign in the header, and the live order island.

## Direction contract
THESIS: The app is Khedi Market's own shopfront: solid enamel signboard colour and sign lettering carry the brand, while the shelf (products, prices, stock) stays the clearest thing on every screen. It refuses the white-tile quick-commerce template and the cream boutique.
OWN-WORLD: Signwriter enamel: deep signboard green owns the shell (header, active nav, selected states), chrome yellow is the one action colour (Add, Buy now, Place order), post-box red only for offers and alerts, on a cool limewash ground with white product boards. Display type is a condensed signage grotesque in caps for headings, prices and the wordmark; a sturdy grotesque for UI text with tabular figures. Square-ish 10px corners, flat surfaces, tone steps instead of shadows; shadows only on what floats.
STORY: The visitor sees the store is open and how fast it delivers, finds the item, adds it with one tap, watches the total count up, slides to place the order, then follows it live from the order island docked above the tab bar on every shop page (moved from the top during the build: the header already holds search, location and the hanging sign, and the island's Track action belongs in thumb reach on a phone).
FIRST VIEWPORT: Green signboard header: logo plate left, hanging sign (OPEN 45 min / CLOSED) swinging beside it, delivery location under, search bar full width. Below: swipeable offer boards deck, red facts ticker, category boards grid, then product rails. Primary action: yellow Add on every product tile; bottom tab bar with sliding indicator.
FORM: Kohima market hand-painted signboards, candidate 3 of 7 on my resonance list. seed:44ac9198033e8ebd (degraded roll, no challengers).
SIGNATURE INTERACTION + MOTION GRAMMAR: Hanging sign swings on a spring from its hooks and flips on status change; live order island morphs between compact and expanded states; prices and totals roll digit by digit; product image carries over into the product page (view transition); swipe-to-place-order thumb; tracking timeline line fills to the current step. Exponential ease-out from visible defaults, springs with bounce 0.15 to 0.3 for physical objects, 150 to 250ms UI, reduced-motion fallbacks everywhere.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
