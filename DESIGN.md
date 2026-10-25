---
name: Gupta Enterprises
description: A Kohima stationery shop's own shopfront, painted like the signboards of Khedi Market.
colors:
  signboard-green: "#0b5a45"
  signboard-green-deep: "#083f31"
  shell-board: "#0a4d3b"
  green-wash: "#dfeee7"
  chrome-yellow: "#f5b800"
  chrome-yellow-deep: "#d99e00"
  yellow-wash: "#fff1c2"
  on-yellow: "#1d1600"
  postbox-red: "#cf1f2b"
  red-wash: "#fde4e4"
  limewash: "#eef2ee"
  board-white: "#ffffff"
  sunk: "#e5ebe6"
  ink-text: "#13201a"
  muted-text: "#536259"
  rule: "#cfdbd3"
  line: "#dbe3dd"
  ok-green: "#1d8a4b"
  island-black: "#0b1914"
typography:
  display:
    fontFamily: "Big Shoulders Display Variable, Arial Narrow, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "0.02em"
  headline:
    fontFamily: "Big Shoulders Display Variable, Arial Narrow, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1
  price:
    fontFamily: "Big Shoulders Display Variable, Arial Narrow, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "tnum"
  body:
    fontFamily: "Schibsted Grotesk Variable, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Schibsted Grotesk Variable, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  tag: "5px"
  control: "9px"
  input: "10px"
  board: "12px"
  hero: "14px"
  sheet: "20px"
spacing:
  gutter: "16px"
  tile-gap: "10px"
  section: "36px"
components:
  button-action:
    backgroundColor: "{colors.chrome-yellow}"
    textColor: "{colors.on-yellow}"
    typography: "{typography.headline}"
    rounded: "{rounded.control}"
    height: "48px"
  button-action-hover:
    backgroundColor: "{colors.chrome-yellow-deep}"
  button-board:
    backgroundColor: "{colors.shell-board}"
    textColor: "{colors.board-white}"
    rounded: "{rounded.control}"
    height: "48px"
  product-tile:
    backgroundColor: "{colors.board-white}"
    rounded: "{rounded.board}"
    padding: "8px"
  chip-selected:
    backgroundColor: "{colors.shell-board}"
    textColor: "{colors.board-white}"
    rounded: "{rounded.control}"
  chip:
    backgroundColor: "{colors.board-white}"
    textColor: "{colors.ink-text}"
    rounded: "{rounded.control}"
  input-search:
    backgroundColor: "{colors.board-white}"
    textColor: "{colors.ink-text}"
    rounded: "{rounded.input}"
    height: "44px"
  discount-tag:
    backgroundColor: "{colors.postbox-red}"
    textColor: "{colors.board-white}"
    rounded: "{rounded.tag}"
  price-plate:
    backgroundColor: "{colors.green-wash}"
    textColor: "{colors.signboard-green-deep}"
    typography: "{typography.price}"
    rounded: "{rounded.tag}"
---

# Design System: Gupta Enterprises

## Overview

**Creative North Star: "The Khedi Market Signboard"**

The app is the shop's own front at Khedi Market, Kohima: hand-painted enamel colour on boards, condensed sign lettering, and a shelf of products that is always the clearest thing on screen. The shell (header, footer, admin rail, agent header) is a solid signboard green board; product boards sit flat on a cool limewash ground; one chrome-yellow colour means "do this" everywhere. Post-box red only ever means an offer or a problem.

Premium comes from motion and type, not ornament. Physical objects behave physically: the OPEN/CLOSED board swings from its nail and flips, offer boards are a deck you flick away, the order-placed sign drops in on its strings. Everything else is quick, quiet feedback: digits that roll, a board that slides under the selected tab, a line that fills to the current order step.

**Key Characteristics:**
- Solid enamel colour fields, no gradients, glows or glass.
- Condensed sign caps for headings, prices, tags and buttons; a sturdy grotesque for reading.
- Flat boards separated by tone steps; shadows only on things that float.
- One action colour (chrome yellow); green for selection and shell; red for offers and alerts.
- Motion explains state and stays under 300ms for routine UI; physical swings and drops are the only long moves.

## Colors

Signwriter's enamel on a limewashed wall: three saturated paints and calm, green-tinted neutrals.

### Primary
- **Signboard Green** (#0b5a45; shell board #0a4d3b): the header, footer, admin rail, agent header, selected chips, tab and variant boards, links and icons. In dark mode text-green lifts to #5cd3a5 and the shell to #0a3329.

### Secondary
- **Chrome Yellow** (#f5b800, hover #d99e00, text on it #1d1600): every primary action (Add, Add to cart, Proceed, Slide to place order, Track order), the OPEN face of the sign, the cart badge, the focus ring and text selection.

### Tertiary
- **Post-box Red** (#cf1f2b): discount tags, the red facts ticker, offer boards, the CLOSED face of the sign, errors and destructive hovers. Boards painted red keep #cf1f2b in both themes so white text stays legible.

### Neutral
- **Limewash** (#eef2ee): the page ground.
- **Board White** (#ffffff): product tiles, cards, inputs, sheets.
- **Sunk** (#e5ebe6): one tone step below the ground; image wells, skeletons, quiet buttons, hovers.
- **Ink** (#13201a): body text. **Muted** (#536259): secondary text (5.6:1 on limewash).
- **Rule / Line** (#cfdbd3 / #dbe3dd): dividers inside boards, scrollbar thumb.
- **Island Black** (#0b1914): the live order island and toasts, in both themes.

### Named Rules
**The One Paint For Action Rule.** Chrome yellow is the only colour that asks for a tap. Green selects, red warns; neither is ever a primary call to action.
**The Fixed Red Board Rule.** A board painted red (offers, ticker) uses #cf1f2b in light and dark; theme-adaptive red is for text and small tags only.

## Typography

**Display Font:** Big Shoulders Display (condensed signage grotesque, self-hosted)
**Body Font:** Schibsted Grotesk (sturdy grotesque, tabular figures via `.num`)

**Character:** painted shop-sign caps over a plain, reliable reading face. The sign face carries the brand; the grotesque carries the information.

### Hierarchy
- **Display** (800, 34-52px caps, 1.02): page titles, the account and aisle boards, the order-placed sign, login.
- **Headline** (800, 22-26px caps): section heads ("Picked for you"), sheet titles, bill headings.
- **Price** (800, 20-44px, tabular): every price and total; totals roll digit by digit.
- **Body** (400, 15px, 1.5): descriptions, addresses, help text.
- **Label** (600-700, 12-13px, sentence case): meta lines, chip text, nav labels.

### Named Rules
**The Painted Detail Rule.** Big lettering on a painted board (offer boards, aisle sign, account board) carries the signwriter's flat shade (`text-shadow: 0.055em 0.055em 0` in a darker tone of the board), and those boards carry a painted keyline 6px inside the edge. Nowhere else.
**The Sign Caps Rule.** Uppercase lives only in the display face (headings, prices, tags, action buttons). Body-face text is always sentence case; no tiny tracked labels.

## Layout

Phone first at 360-430px with a 16px gutter. Rails scroll horizontally with snap; grids are 2 columns on phones, 3-5 on wider screens; category boards 3-4 per row on phones, 10 on desktop. Content width caps at 72rem. The shop has a sticky green header (its top row tucks away on scroll down, search stays) and a fixed bottom tab bar on phones; the order island docks above the tab bar. Admin uses a green side rail on desktop and a sticky green top bar with scrolling tabs on phones; tables become cards below 768px. Sections are ~36px apart; more space above a heading than below it.

## Elevation & Depth

Flat by default. Depth comes from tone steps: limewash ground, white boards, sunk wells. Only things that float carry a shadow (`--shadow-float`: `0 12px 32px -12px rgb(8 40 30 / .35), 0 2px 6px rgb(8 40 30 / .08)`): popovers, the hours card, sheets, dropdowns, the island, toasts, the slide handle. The hanging sign's faces cast a small soft shadow because they physically hang.

### Named Rules
**The Flat Board Rule.** A board at rest has no border and no shadow. If it needs separation, step its tone.

## Shapes

Square-ish painted boards: 5px tags, 9-10px controls and inputs, 12px tiles and cards, 14px hero boards, 20px top corners on bottom sheets. Pills (full radius) only for counts, status chips and the island. The logo is a trimmed sign plate hanging from a nail by two strings; that silhouette (plate, trim, strings) is the brand's only recurring motif.

## Components

### Buttons
- **Action (yellow):** chrome yellow, sign caps 17-20px, 48px tall (36px on tiles), 9px radius; hover darkens to #d99e00; press scales to 0.97.
- **Board (green):** shell green with white text for secondary strong actions (Buy now, Apply, admin and account boards).
- **Quiet:** sunk background, ink text (Clear all, close buttons).

### Chips and segmented controls
- Unselected: white board (inset 1px line ring inside sheets). Selected: green board with white text; a check slides in. Segmented pickers (delivery type, theme, variants, admin nav, bottom tabs) slide one board between options with a spring (0.4s, bounce 0.2).

### Product tile
- White 12px board; the product picture (art on a transparent ground, or a photo) sits on a white photo area, white in both themes, edge to edge above a 1px line rule; the discount is a red corner plate flush to the top-left corner (10px bottom-right radius); the heart sits bare on the picture; 2-line name and meta; the price is painted on a green-wash tag plate (#dfeee7, 5px radius, display face); yellow Add turns into a yellow stepper with rolling quantity. Tapping the tile grows its picture into the product page picture (view transition named `product-hero`).

### Inputs
- White, 10px radius, no border; focus shows a 2px chrome-yellow ring. 16px text on phones.

### Navigation
- Phone tab bar: white bar, icon on a sliding green board when active (yellow icon). Header: green signboard with logo plate, delivery location, hanging sign, bell and account.

### The Hanging Sign (signature)
- A two-sided board (yellow OPEN with the delivery time, red CLOSED with the opening time) hangs from a nail in the header. It swings on load and when tapped, flips (rotateY spring) when the store opens or closes, computed from the live clock in the browser, and opens a card with today's hours.

### Live order island
- A dark pill above the tab bar while an order is active: status in yellow sign caps plus one line. Tap to expand (layout spring) into step bars, order number and Track order.

### Slide to place order
- Green track, yellow handle; drag past 82% to place the order; spinner then tick. Enter on the focused handle confirms; a tap nudges the handle to teach the gesture.

## Do's and Don'ts

### Do:
- **Do** paint shell surfaces solid signboard green (#0a4d3b) and keep product boards white on limewash (#eef2ee).
- **Do** use chrome yellow (#f5b800) for every primary action and nothing decorative.
- **Do** set headings, prices and action labels in Big Shoulders Display caps; roll changing numbers with NumberFlow.
- **Do** use ease-out `cubic-bezier(0.23, 1, 0.32, 1)` for UI, the drawer curve `cubic-bezier(0.32, 0.72, 0, 1)` for sheets, and springs (bounce 0.15-0.3) for physical objects.
- **Do** keep content visible by default; scroll reveals only hide items once the watcher script is running, and reduced motion removes travel.

### Don't:
- **Don't** use gradients, glows, aurora or beam backgrounds, or blurred glass panels (the owner chose skills-first over Aceternity's look).
- **Don't** put borders or shadows on boards at rest.
- **Don't** use red for anything but offers, closed status and errors.
- **Don't** set body text in uppercase or add small tracked labels above headings.
- **Don't** animate keyboard actions or routine state changes longer than 300ms.
