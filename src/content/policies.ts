// Store policies for Gupta Enterprises, Kohima.
// Drafted to be conservative. Have them reviewed by a lawyer before launch.

export const POLICY_UPDATED = "25 October 2026";

export type PolicySection = { heading: string; body: string[] };
export type Policy = { slug: string; title: string; summary: string; sections: PolicySection[] };

const STORE = "Gupta Enterprises (proprietorship), Khedi Market, New NST, opposite Hotel Galaxy, Kohima, Nagaland 797001. GSTIN 13CNAPG5572Q1ZP.";
const CONTACT = "Grievance Officer: Ashutosh Gupta, phone 7905529544, email guptaenterpriseskohima@gmail.com.";

export const POLICIES: Policy[] = [
  {
    slug: "privacy",
    title: "Privacy policy",
    summary: "We collect only what we need to deliver your order, never sell your data, and you can ask us to delete it at any time.",
    sections: [
      { heading: "Who we are", body: [
        STORE,
        "This policy explains how we handle personal data in the Gupta Enterprises app and website, in line with India's Digital Personal Data Protection Act, 2023, the Information Technology Act, 2000 and the Consumer Protection (E-Commerce) Rules, 2020.",
      ] },
      { heading: "What we collect", body: [
        "Account: your name, email address and profile photo from your Google account when you sign in. We never see your Google password.",
        "Contact and delivery: your mobile number, saved addresses (house or building name, road, landmark), the map pin you set, and the name and number of anyone you order for.",
        "Orders and payments: what you order, amounts, coupon and SuperCoin use, payment method, and the payment reference (UTR) for UPI payments. We do not collect card numbers, UPI PINs or bank passwords.",
        "Refunds: the UPI ID you give us for a refund, and the photos you upload with a return or review.",
        "Location: your device location only when you allow it, to check you are within our 15 km delivery area and to place the delivery pin. We do not track customers in the background.",
        "Delivery agents: an agent's live location is collected only while they are on an active delivery, so the customer can follow it.",
        "Usage: search terms (stored without your name, to improve what we stock) and basic technical logs needed to keep the service secure.",
      ] },
      { heading: "Why we use it", body: [
        "To create your account, take and deliver orders, process payments, refunds and returns, and send you order updates.",
        "To run SuperCoins, referrals and coupons you choose to use.",
        "To prevent fraud and misuse, such as fake orders or repeated cancellations.",
        "To keep tax records required under GST law.",
        "We send offers only if you turn them on. Order updates are always sent because they are part of the service.",
      ] },
      { heading: "Who we share it with", body: [
        "We never sell or rent your personal data, and we do not use advertising trackers.",
        "Store staff see the order details they need to pack and dispatch it. The delivery agent assigned to your order sees your name, phone, address and pin, from when they accept the order until it is delivered.",
        "Service providers who process data for us under contract: Supabase (database and file storage; our data is currently stored in Supabase's Sydney, Australia region), Brevo (sending order and OTP emails), Cloudflare (website hosting and security), Google (sign-in) and OpenStreetMap services (maps and address lookup).",
        "Government or courts, only when the law requires it.",
      ] },
      { heading: "How long we keep it", body: [
        "Orders and invoices: 8 years, as required for GST and accounting.",
        "Agent location trails: deleted 7 days after the delivery.",
        "Return and review photos: kept while the order record is kept, unless you delete a review.",
        "If you delete your account, we erase your profile, addresses, cart and wishlist within 30 days. Records the law requires us to keep are retained in restricted form.",
      ] },
      { heading: "Your rights", body: [
        "You can see and correct your details in the app, ask for a copy of your data, withdraw consent for optional uses, and ask us to delete your account.",
        "Send requests to the Grievance Officer below. We acknowledge within 48 hours and resolve within 30 days.",
        "If you are not satisfied, you may complain to the Data Protection Board of India.",
      ] },
      { heading: "Children", body: [
        "Gupta Enterprises is for people aged 18 and over. Students under 18 may use it only through a parent or guardian's account and with their consent. We do not knowingly collect data from children.",
      ] },
      { heading: "Security", body: [
        "Data is encrypted in transit, access is limited by role, and every admin action is logged. Payment confirmation is checked on our server, never trusted from the phone.",
        "If a data breach affects you, we will tell you and the authorities as the law requires.",
      ] },
      { heading: "Contact", body: [CONTACT] },
    ],
  },
  {
    slug: "terms",
    title: "Terms of use",
    summary: "The rules for using Gupta Enterprises, ordering, coupons and SuperCoins.",
    sections: [
      { heading: "About these terms", body: [STORE, "By signing in or placing an order you agree to these terms and to our privacy, delivery, cancellation and returns policies."] },
      { heading: "Your account", body: [
        "Sign-in is with Google only. You must be 18 or over, or use the app through a parent or guardian.",
        "Keep your account details accurate. You are responsible for orders placed from your account.",
        "We may suspend accounts used for fraud, abuse of offers, repeated refused deliveries, or abusive behaviour toward staff or agents.",
      ] },
      { heading: "Prices and orders", body: [
        "Prices are in Indian rupees and include all taxes. Every order comes with a bill you can view and download from the order page.",
        "Product photos may be illustrations; colour and packaging can vary slightly.",
        "An order is confirmed when you receive an order confirmation. We may cancel an order and refund you in full if an item is out of stock, priced in error, or the address is outside our delivery area.",
        "Minimum order value is ₹99 (item total after coupon). Delivery is ₹49, free when the item total after coupon is ₹499 or more. Store pickup is always free. These values may change and are shown before you pay.",
      ] },
      { heading: "Bills and GST invoices", body: [
        "For every order we generate an itemised bill showing what you bought, prices, discounts, coupons, SuperCoins, delivery fee, the amount payable and how you paid. Open any order and tap \u201cView bill\u201d to see it, print it or save it as a PDF.",
        "This bill is an order receipt. It is not a GST tax invoice and does not show a tax breakup.",
        "If you need a GST tax invoice (for example to claim input tax credit), contact the store with your order number and your GSTIN and business name. We will issue the invoice for that order. Please ask within the same financial year as the order.",
        "If an order is changed, returned or refunded, the bill shows the original order; refunds are shown on the order page.",
      ] },
      { heading: "Payments", body: [
        "You can pay by UPI, cash on delivery, or for pickup orders, at the store counter.",
        "UPI payments go directly to the store's UPI account. An order is marked paid only after we confirm the payment. If money leaves your account but the order is not confirmed, contact us with your UTR and we will confirm or refund it.",
        "We may limit cash on delivery for high-value orders or for accounts with refused deliveries.",
      ] },
      { heading: "SuperCoins", body: [
        "1 SuperCoin equals ₹1 off a future order. Coins have no cash value and cannot be transferred or withdrawn.",
        "You earn 2% of the item value you actually paid (after coupons and coins, excluding delivery fee), credited once the 3-day return window closes. Coins expire 10 days after they are credited.",
        "Referral reward: when a new user signs up with your code, you each receive 50 coins after their first order is delivered and its return window closes.",
        "Coins earned on items that are returned are reversed. We may cancel coins gained through misuse.",
      ] },
      { heading: "Coupons", body: [
        "Each coupon has its own conditions (minimum order, expiry, usage limits) shown when you apply it. Only one coupon can be used per order.",
        "We may withdraw or change coupons at any time; changes do not affect orders already placed.",
      ] },
      { heading: "Liability", body: [
        "We are responsible for delivering what you ordered in good condition. Our liability for any order is limited to the amount you paid for it, except where the law does not allow such a limit.",
        "Delivery times are estimates. Weather, road conditions and traffic in Kohima can cause delays.",
      ] },
      { heading: "Law and disputes", body: [
        "These terms are governed by the laws of India. Disputes are subject to the courts at Kohima, Nagaland. Please contact our Grievance Officer first; most issues can be solved quickly.",
        CONTACT,
      ] },
    ],
  },
  {
    slug: "shipping",
    title: "Delivery and pickup",
    summary: "Quick delivery in 45-60 minutes, 2-hour scheduled slots, or free store pickup.",
    sections: [
      { heading: "Delivery area", body: ["We deliver to addresses within 15 km road distance of our Khedi Market store. Distance is measured along roads at checkout. Outside this area you can still choose store pickup."] },
      { heading: "Hours", body: [
        "Store open for pickup: 10:00 to 17:30.",
        "Deliveries: 11:00 to 16:00. Quick delivery orders are accepted until 15:00.",
        "Outside delivery hours you can schedule a delivery or a pickup.",
      ] },
      { heading: "Delivery options", body: [
        "Quick delivery: an estimated 45 to 60 minutes after the order is confirmed.",
        "Scheduled delivery: choose a 2-hour slot up to 7 days ahead, subject to slot availability.",
        "Store pickup: we tell you when your order is ready. Pickup orders not collected within 48 hours of being ready are cancelled automatically and refunded.",
      ] },
      { heading: "Fees", body: ["₹49 delivery fee, free when the item total after coupon is ₹499 or more. Pickup is always free."] },
      { heading: "Handing over", body: [
        "When your order is out for delivery, we email a 4-digit code to your sign-in email. Share it with the agent only when you have your order. If you ordered for someone else, pass the code to them.",
        "Please check the package when it arrives. If something is missing or damaged, tell us within 24 hours.",
      ] },
    ],
  },
  {
    slug: "cancellation",
    title: "Cancellation policy",
    summary: "Three free cancellations a week; after that, ₹30 per cancellation, added to your next order.",
    sections: [
      { heading: "When you can cancel", body: ["You can cancel an order from the app at any stage before it is out for delivery. Once it is out for delivery, it can't be cancelled in the app; you may refuse it at the door."] },
      { heading: "Free cancellations", body: [
        "You get 3 free cancellations per week (Monday to Sunday, Indian time).",
        "From the 4th cancellation in the same week, a ₹30 fine applies to each cancellation. It is not charged separately: it is added to your next order's bill, and shown clearly before you pay.",
      ] },
      { heading: "Refunds for cancelled orders", body: [
        "If you paid by UPI, the full amount is refunded to the UPI ID you provide within 7 working days.",
        "SuperCoins and single-use coupons used on a cancelled order are restored to your account.",
      ] },
      { heading: "Cancellations by us", body: ["If we cancel an order (for example, an item is out of stock or the address is unreachable), there is no fine and you receive a full refund."] },
    ],
  },
  {
    slug: "returns",
    title: "Returns and refunds",
    summary: "Return eligible items within 3 days of delivery with a reason and a photo. Refunds go to your UPI ID with proof shown in the app.",
    sections: [
      { heading: "Return window", body: ["You can request a return within 3 days of delivery from the order page. After 3 days the return option closes."] },
      { heading: "What can be returned", body: [
        "Items must be unused, with tags and original packaging.",
        "Not returnable: custom printing and personalised stationery, opened ink bottles and refills, and items marked \"non-returnable\" on the product page. Damaged, defective or wrong items can always be reported within 24 hours of delivery.",
      ] },
      { heading: "How to return", body: [
        "Choose the items, tell us the reason, and add at least one photo.",
        "Give a UPI ID for your refund. We review the request and either approve it and send an agent to collect the item, or reject it with a written reason.",
      ] },
      { heading: "Refunds", body: [
        "After the item reaches the store, we refund the amount you paid for it to your UPI ID within 7 working days, including for cash on delivery orders.",
        "We upload the payment screenshot and reference number to your return, where you can view and download it.",
        "If a coupon was used, the refund is reduced in proportion to the coupon. SuperCoins earned on returned items are reversed.",
      ] },
      { heading: "Help", body: [CONTACT] },
    ],
  },
];

export const getPolicy = (slug: string) => POLICIES.find((p) => p.slug === slug);
