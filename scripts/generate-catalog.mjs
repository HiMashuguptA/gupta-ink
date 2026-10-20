// Generates original product illustrations (public/catalog/*.svg) and supabase/seed.sql
// for the dummy test catalogue. Run: node scripts/generate-catalog.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "catalog");
mkdirSync(outDir, { recursive: true });

// ------------------------------------------------------------- illustration kit
const tint = (hex, a = 0.14) => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (c) => Math.round(c * a + 255 * (1 - a));
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
};
const shade = (hex, f = 0.7) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * f));
  return `rgb(${c.join(",")})`;
};

const shapes = {
  notebook: (c) => `
    <rect x="170" y="110" width="270" height="380" rx="18" fill="${c}"/>
    <rect x="170" y="110" width="42" height="380" rx="14" fill="${shade(c)}"/>
    ${[150, 210, 270, 330, 390, 450].map((y) => `<circle cx="191" cy="${y}" r="7" fill="#fff" opacity=".85"/>`).join("")}
    <rect x="250" y="170" width="150" height="64" rx="10" fill="#fff"/>
    <rect x="266" y="190" width="110" height="7" rx="3" fill="${tint(c, .5)}"/>
    <rect x="266" y="208" width="76" height="7" rx="3" fill="${tint(c, .5)}"/>`,
  longbook: (c) => `
    <rect x="200" y="80" width="210" height="440" rx="16" fill="${c}"/>
    <rect x="200" y="80" width="30" height="440" rx="12" fill="${shade(c)}"/>
    <rect x="255" y="140" width="125" height="56" rx="10" fill="#fff"/>
    <rect x="268" y="160" width="96" height="6" rx="3" fill="${tint(c, .5)}"/>
    <rect x="268" y="176" width="64" height="6" rx="3" fill="${tint(c, .5)}"/>`,
  spiral: (c) => `
    <rect x="175" y="130" width="270" height="350" rx="16" fill="${c}"/>
    ${[160, 200, 240, 280, 320, 360, 400, 440].map((y) => `<path d="M160 ${y} q22 -14 34 0" stroke="#5b6170" stroke-width="7" fill="none" stroke-linecap="round"/>`).join("")}
    <rect x="235" y="180" width="160" height="10" rx="5" fill="#fff" opacity=".7"/>
    <rect x="235" y="205" width="110" height="10" rx="5" fill="#fff" opacity=".7"/>`,
  pen: (c) => `
    <g transform="rotate(-35 300 300)">
      <rect x="285" y="90" width="34" height="330" rx="14" fill="${c}"/>
      <rect x="281" y="120" width="10" height="120" rx="4" fill="${shade(c, .6)}"/>
      <path d="M285 420 h34 l-17 70 z" fill="#d9dce6"/>
      <path d="M297 470 h10 l-5 26 z" fill="${shade(c, .5)}"/>
      <rect x="285" y="90" width="34" height="34" rx="12" fill="${shade(c, .75)}"/>
    </g>`,
  fountain: (c) => `
    <g transform="rotate(-35 300 300)">
      <rect x="278" y="80" width="46" height="300" rx="20" fill="${c}"/>
      <rect x="278" y="250" width="46" height="14" fill="#e9a23b"/>
      <path d="M282 380 h38 l-8 40 h-22 z" fill="${shade(c, .6)}"/>
      <path d="M290 420 h22 l-11 80 z" fill="#e9a23b"/>
      <line x1="301" y1="430" x2="301" y2="490" stroke="${shade(c, .5)}" stroke-width="3"/>
      <rect x="314" y="100" width="8" height="110" rx="4" fill="#e9a23b"/>
    </g>`,
  ink: (c) => `
    <rect x="215" y="230" width="170" height="230" rx="34" fill="${c}"/>
    <rect x="250" y="170" width="100" height="70" rx="10" fill="#2c3140"/>
    <rect x="245" y="300" width="110" height="80" rx="12" fill="#fff"/>
    <path d="M300 315 c18 22 18 40 0 50 c-18 -10 -18 -28 0 -50z" fill="${c}"/>`,
  pencil: (c) => `
    ${[0, 1, 2].map((i) => `<g transform="translate(${i * 70 - 70} 0) rotate(${i * 6 - 6} 300 300)">
      <rect x="282" y="120" width="36" height="290" fill="${c}"/>
      <rect x="282" y="110" width="36" height="22" fill="#e45b7a"/>
      <rect x="282" y="132" width="36" height="12" fill="#c6c9d2"/>
      <path d="M282 410 h36 l-18 60 z" fill="#f2cf9a"/>
      <path d="M294 450 h12 l-6 20 z" fill="#2c3140"/></g>`).join("")}`,
  mechpencil: (c) => `
    <g transform="rotate(-35 300 300)">
      <rect x="288" y="90" width="28" height="320" rx="10" fill="${c}"/>
      <rect x="284" y="250" width="36" height="70" rx="8" fill="#2c3140" opacity=".8"/>
      <path d="M288 410 h28 l-10 50 h-8 z" fill="#c6c9d2"/>
      <rect x="300" y="458" width="4" height="22" fill="#2c3140"/>
    </g>`,
  eraser: (c) => `
    ${[0, 1, 2].map((i) => `<g transform="translate(${i * 40 - 40} ${i * 30 - 30})">
      <rect x="210" y="250" width="180" height="90" rx="14" fill="#fff" stroke="#d8dbe5" stroke-width="4"/>
      <rect x="210" y="250" width="110" height="90" rx="14" fill="${c}"/></g>`).join("")}`,
  sharpener: (c) => `
    <rect x="200" y="240" width="200" height="170" rx="26" fill="${c}"/>
    <rect x="230" y="200" width="140" height="70" rx="14" fill="${shade(c, .8)}"/>
    <circle cx="300" cy="235" r="20" fill="#2c3140"/>
    <rect x="250" y="300" width="100" height="70" rx="10" fill="#fff" opacity=".35"/>`,
  marker: (c) => `
    <g transform="rotate(-30 300 300)">
      <rect x="265" y="130" width="70" height="300" rx="20" fill="#f2f3f7" stroke="#d8dbe5" stroke-width="4"/>
      <rect x="265" y="90" width="70" height="80" rx="20" fill="${c}"/>
      <rect x="265" y="250" width="70" height="60" fill="${c}"/>
      <path d="M280 430 h40 l-6 34 h-28 z" fill="#2c3140"/>
      <path d="M290 464 h20 l-10 28 z" fill="${c}"/>
    </g>`,
  highlighter: (c) => `
    ${["#ffd84a", "#7fe08a", "#ff8fb1", "#7cc8ff", "#ffad5c"].map((h, i) => `<g transform="translate(${i * 62 - 124} 0)">
      <rect x="282" y="160" width="38" height="250" rx="12" fill="${h}"/>
      <rect x="282" y="160" width="38" height="70" rx="12" fill="${shade(h, .82)}"/>
      <path d="M286 410 h30 l-4 34 h-22 z" fill="${shade(h, .7)}"/></g>`).join("")}`,
  crayon: (c) => `
    ${["#e94b4b", "#f5a524", "#ffd84a", "#3fb950", "#2f81f7", "#8957e5"].map((h, i) => `<g transform="translate(${i * 46 - 115} ${i % 2 ? 20 : 0})">
      <rect x="282" y="180" width="32" height="230" rx="6" fill="${h}"/>
      <path d="M282 180 l16 -46 l16 46 z" fill="${h}"/>
      <rect x="282" y="250" width="32" height="70" fill="#fff" opacity=".45"/></g>`).join("")}`,
  paint: (c) => `
    <rect x="140" y="200" width="320" height="220" rx="22" fill="#fff" stroke="#d8dbe5" stroke-width="5"/>
    ${["#e94b4b", "#f5a524", "#ffd84a", "#3fb950", "#2f81f7", "#8957e5", "#7a4b2a", "#2c3140"].map((h, i) => `<ellipse cx="${190 + (i % 4) * 74}" cy="${265 + Math.floor(i / 4) * 92}" rx="28" ry="24" fill="${h}"/>`).join("")}
    <g transform="rotate(30 420 160)"><rect x="410" y="80" width="16" height="170" rx="8" fill="${c}"/><path d="M410 250 h16 l-8 40 z" fill="#2c3140"/></g>`,
  drawingbook: (c) => `
    <rect x="150" y="120" width="300" height="370" rx="14" fill="${c}"/>
    <rect x="175" y="150" width="250" height="210" rx="10" fill="#fff"/>
    <circle cx="350" cy="205" r="26" fill="#ffd84a"/>
    <path d="M185 350 l70 -90 l55 60 l40 -40 l65 70 z" fill="${tint(c, .6)}"/>`,
  stapler: (c) => `
    <rect x="140" y="370" width="330" height="40" rx="18" fill="#2c3140"/>
    <path d="M160 360 q0 -90 90 -100 h210 q20 0 20 22 v40 q0 22 -22 22 h-280 z" fill="${c}"/>
    <rect x="200" y="300" width="220" height="12" rx="6" fill="#fff" opacity=".45"/>`,
  pins: (c) => `
    <rect x="180" y="210" width="240" height="190" rx="16" fill="${c}"/>
    <rect x="180" y="210" width="240" height="50" rx="16" fill="${shade(c, .8)}"/>
    ${[0, 1, 2, 3, 4].map((i) => `<path d="M${215 + i * 38} 300 v40 h22 v-40" stroke="#c6c9d2" stroke-width="5" fill="none"/>`).join("")}`,
  paper: (c) => `
    <rect x="160" y="180" width="280" height="260" rx="10" fill="#fff" stroke="#d8dbe5" stroke-width="4"/>
    <rect x="160" y="250" width="280" height="120" fill="${c}"/>
    <rect x="200" y="285" width="140" height="16" rx="8" fill="#fff"/>
    <rect x="200" y="312" width="90" height="12" rx="6" fill="#fff" opacity=".7"/>
    ${[0, 1, 2].map((i) => `<rect x="${170 - i * 6}" y="${190 - i * 8}" width="280" height="10" rx="4" fill="#eef0f5"/>`).join("")}`,
  folder: (c) => `
    ${[0, 1, 2].map((i) => `<g transform="translate(${i * 24 - 24} ${i * 24 - 24})">
      <path d="M160 200 h110 l26 26 h144 v230 h-280 z" fill="${c}" opacity="${0.5 + i * 0.25}"/>
      <rect x="160" y="250" width="280" height="206" rx="6" fill="${tint(c, .35)}" opacity=".55"/></g>`).join("")}`,
  sticky: (c) => `
    ${[0, 1, 2].map((i) => `<rect x="${200 - i * 20}" y="${180 + i * 30}" width="220" height="220" rx="8" fill="${["#ffd84a", "#ff8fb1", "#7fe08a"][i]}" transform="rotate(${i * 6 - 6} 300 300)"/>`).join("")}`,
  register: (c) => `
    <rect x="170" y="100" width="260" height="400" rx="12" fill="${c}"/>
    <rect x="170" y="100" width="260" height="60" rx="12" fill="${shade(c, .7)}"/>
    <rect x="170" y="440" width="260" height="60" rx="12" fill="${shade(c, .7)}"/>
    <rect x="225" y="240" width="150" height="80" rx="8" fill="#fff"/>
    <rect x="245" y="262" width="110" height="8" rx="4" fill="${tint(c, .55)}"/>
    <rect x="245" y="282" width="70" height="8" rx="4" fill="${tint(c, .55)}"/>`,
  billbook: (c) => `
    <rect x="180" y="140" width="240" height="330" rx="10" fill="#fff" stroke="#d8dbe5" stroke-width="4"/>
    <rect x="180" y="140" width="240" height="56" rx="10" fill="${c}"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="205" y="${225 + i * 36}" width="${i % 2 ? 120 : 190}" height="9" rx="4" fill="#e3e6ef"/>`).join("")}
    <rect x="320" y="420" width="76" height="24" rx="6" fill="${tint(c, .45)}"/>`,
  geometry: (c) => `
    <rect x="130" y="210" width="340" height="200" rx="18" fill="${c}"/>
    <rect x="150" y="230" width="300" height="160" rx="10" fill="${shade(c, .82)}"/>
    <path d="M190 370 l80 -120 l0 120 z" fill="#fff" opacity=".85"/>
    <path d="M300 370 a70 70 0 0 1 140 0 z" fill="#fff" opacity=".85"/>
    <circle cx="370" cy="370" r="6" fill="${c}"/>`,
  clipboard: (c) => `
    <rect x="180" y="120" width="240" height="370" rx="18" fill="${c}"/>
    <rect x="205" y="160" width="190" height="300" rx="6" fill="#fff"/>
    <rect x="250" y="100" width="100" height="44" rx="10" fill="#c6c9d2"/>
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="225" y="${195 + i * 42}" width="${i % 2 ? 100 : 150}" height="9" rx="4" fill="#e3e6ef"/>`).join("")}`,
  pouch: (c) => `
    <rect x="130" y="210" width="340" height="200" rx="30" fill="${tint(c, .45)}" stroke="${c}" stroke-width="6"/>
    <rect x="130" y="210" width="340" height="40" rx="20" fill="${c}"/>
    <rect x="420" y="222" width="34" height="16" rx="8" fill="#fff"/>
    <g opacity=".75"><rect x="180" y="290" width="150" height="16" rx="8" fill="#2f81f7"/><rect x="180" y="330" width="200" height="16" rx="8" fill="#e94b4b"/></g>`,
  docfolder: (c) => `
    <rect x="150" y="160" width="300" height="300" rx="20" fill="${c}"/>
    <rect x="150" y="160" width="300" height="70" rx="20" fill="${shade(c, .8)}"/>
    <circle cx="300" cy="230" r="16" fill="#fff"/>
    <path d="M300 300 c30 36 30 60 0 76 c-30 -16 -30 -40 0 -76z" fill="#fff" opacity=".75"/>`,
  cover: (c) => `
    <rect x="175" y="120" width="250" height="360" rx="14" fill="${tint(c, .4)}" stroke="${c}" stroke-width="7"/>
    <rect x="200" y="150" width="200" height="300" rx="8" fill="#fff" opacity=".5"/>
    <path d="M300 230 c26 32 26 54 0 68 c-26 -14 -26 -36 0 -68z" fill="${c}"/>`,
  scale: (c) => `
    <g transform="rotate(-20 300 300)">
      <rect x="90" y="260" width="420" height="80" rx="10" fill="${tint(c, .55)}" stroke="${c}" stroke-width="5"/>
      ${Array.from({ length: 20 }, (_, i) => `<rect x="${110 + i * 20}" y="262" width="3" height="${i % 5 ? 18 : 32}" fill="${c}"/>`).join("")}
    </g>`,
  gift: (c) => `
    <rect x="170" y="260" width="260" height="200" rx="16" fill="${c}"/>
    <rect x="150" y="220" width="300" height="60" rx="14" fill="${shade(c, .85)}"/>
    <rect x="285" y="220" width="30" height="240" fill="#e9a23b"/>
    <path d="M300 220 c-60 -70 -110 -20 -60 0z M300 220 c60 -70 110 -20 60 0z" fill="#e9a23b"/>`,
  kit: (c) => `
    <rect x="140" y="240" width="320" height="230" rx="24" fill="${c}"/>
    <rect x="240" y="200" width="120" height="60" rx="18" fill="none" stroke="${shade(c, .7)}" stroke-width="16"/>
    <g transform="rotate(-12 300 330)"><rect x="200" y="300" width="200" height="22" rx="10" fill="#ffd84a"/><rect x="200" y="340" width="160" height="22" rx="10" fill="#7cc8ff"/><rect x="200" y="380" width="180" height="22" rx="10" fill="#ff8fb1"/></g>`,
  diary: (c) => `
    <rect x="175" y="110" width="250" height="380" rx="20" fill="${c}"/>
    <rect x="395" y="110" width="30" height="380" rx="10" fill="${shade(c, .75)}"/>
    <rect x="330" y="90" width="18" height="140" rx="4" fill="#e9a23b"/>
    <text x="275" y="300" text-anchor="middle" font-family="Georgia, serif" font-size="58" font-weight="700" fill="#fff" opacity=".9">2027</text>`,
};

function svg(shape, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img">
  <rect width="600" height="600" rx="48" fill="${tint(color, 0.13)}"/>
  <ellipse cx="300" cy="520" rx="180" ry="22" fill="${shade(color, 0.5)}" opacity=".10"/>
  ${shapes[shape](color)}
</svg>`;
}

// ------------------------------------------------------------- catalogue data
const categories = [
  { slug: "notebooks", name: "Notebooks", icon: "notebook", color: "#3f5bd8", sort: 1 },
  { slug: "pens", name: "Pens & Ink", icon: "pen", color: "#1f2a6e", sort: 2 },
  { slug: "pencils", name: "Pencils & Erasers", icon: "pencil", color: "#e2a400", sort: 3 },
  { slug: "markers", name: "Markers & Highlighters", icon: "marker", color: "#e94b4b", sort: 4 },
  { slug: "art", name: "Art & Colours", icon: "paint", color: "#8957e5", sort: 5 },
  { slug: "office", name: "Office Supplies", icon: "stapler", color: "#2c7a7b", sort: 6 },
  { slug: "account-books", name: "Account Books", icon: "register", color: "#7a4b2a", sort: 7 },
  { slug: "exam", name: "Exam Essentials", icon: "geometry", color: "#2f81f7", sort: 8 },
  { slug: "monsoon", name: "Monsoon Ready", icon: "pouch", color: "#0ea5a4", sort: 9 },
  { slug: "gifts", name: "Gift Sets", icon: "gift", color: "#d6336c", sort: 10 },
];

// [slug, name, category, brand, shape, description, tags, seasonal, returnable, gst, hsn, unit,
//  variants: [label, colour, hex, mrp, price, stock, featured]]
const P = (o) => o;
const groups = [
  P({ slug: "ruled-notebook-172", name: "Ruled Notebook, 172 pages", cat: "notebooks", brand: "Paperleaf", shape: "notebook", desc: "Single-ruled, 70 GSM paper that does not bleed with gel or fountain ink. Soft laminated cover.", tags: ["copy", "register", "school", "ruled"], gst: 12, hsn: "4820", unit: "piece",
    v: [["Single", "Blue", "#3f5bd8", 6000, 52_00, 120, true], ["Pack of 6", "Blue", "#3f5bd8", 36000, 285_00, 40, false]] }),
  P({ slug: "long-notebook-240", name: "Long Notebook, 240 pages", cat: "notebooks", brand: "Paperleaf", shape: "longbook", desc: "Long-size notebook for college notes, 240 single-ruled pages.", tags: ["long book", "college", "copy"], gst: 12, hsn: "4820", unit: "piece",
    v: [["Green cover", "Green", "#2f9e44", 9500, 82_00, 60, false], ["Maroon cover", "Maroon", "#a61e4d", 9500, 82_00, 55, false]] }),
  P({ slug: "spiral-a5-notebook", name: "Spiral A5 Notebook", cat: "notebooks", brand: "Doodle", shape: "spiral", desc: "Wiro-bound A5 notebook with 160 pages that lies flat.", tags: ["spiral", "diary", "a5"], gst: 12, hsn: "4820", unit: "piece",
    v: [["Red", "Red", "#e03131", 12000, 99_00, 35, true], ["Yellow", "Yellow", "#f2b705", 12000, 99_00, 30, false]] }),
  P({ slug: "ball-pen-07", name: "Ball Pen 0.7 mm", cat: "pens", brand: "Nibbs", shape: "pen", desc: "Smooth low-viscosity ink, comfortable grip, writes up to 1,200 m.", tags: ["ball pen", "pen", "blue pen", "black pen"], gst: 18, hsn: "9608", unit: "piece",
    v: [["Blue", "Blue", "#2546c7", 1000, 10_00, 400, true], ["Black", "Black", "#2c3140", 1000, 10_00, 350, false], ["Red", "Red", "#d9480f", 1000, 10_00, 200, false]] }),
  P({ slug: "gel-pen", name: "Gel Pen 0.5 mm", cat: "pens", brand: "Nibbs", shape: "pen", desc: "Quick-dry gel ink for neat handwriting. Exam friendly.", tags: ["gel", "pen", "exam"], gst: 18, hsn: "9608", unit: "piece",
    v: [["Blue", "Blue", "#364fc7", 2500, 20_00, 220, false], ["Black", "Black", "#212529", 2500, 20_00, 180, false]] }),
  P({ slug: "fountain-pen", name: "Fountain Pen with Converter", cat: "pens", brand: "Kohima Classics", shape: "fountain", desc: "Steel nib, ink converter included, gift box.", tags: ["fountain", "ink pen", "gift"], gst: 18, hsn: "9608", unit: "piece", returnable: true,
    v: [["Navy", "Navy", "#1f2a6e", 45000, 349_00, 18, true], ["Maroon", "Maroon", "#862e4b", 45000, 349_00, 12, false]] }),
  P({ slug: "fountain-ink-30ml", name: "Fountain Pen Ink, 30 ml", cat: "pens", brand: "Kohima Classics", shape: "ink", desc: "Free-flowing, washable ink for all fountain pens.", tags: ["ink", "refill", "bottle"], gst: 18, hsn: "3215", unit: "bottle", returnable: false,
    v: [["Royal Blue", "Blue", "#2546c7", 6000, 55_00, 40, false], ["Black", "Black", "#212529", 6000, 55_00, 35, false]] }),
  P({ slug: "hb-pencils-10", name: "HB Pencils, Box of 10", cat: "pencils", brand: "Doodle", shape: "pencil", desc: "Dark, break-resistant HB lead with erasers on top.", tags: ["pencil", "hb", "school"], gst: 12, hsn: "9609", unit: "box",
    v: [["Box of 10", null, "#f2b705", 6000, 50_00, 150, true]] }),
  P({ slug: "mechanical-pencil-05", name: "Mechanical Pencil 0.5 mm", cat: "pencils", brand: "Nibbs", shape: "mechpencil", desc: "Metal clip, rubber grip, 12 leads included.", tags: ["mechanical", "pencil", "lead"], gst: 18, hsn: "9608", unit: "piece",
    v: [["Teal", "Teal", "#0c8599", 6000, 45_00, 70, false], ["Purple", "Purple", "#7048e8", 6000, 45_00, 60, false]] }),
  P({ slug: "dust-free-eraser-5", name: "Dust-free Erasers, Pack of 5", cat: "pencils", brand: "Doodle", shape: "eraser", desc: "Soft erasers that leave no smudge or dust.", tags: ["eraser", "rubber"], gst: 12, hsn: "4016", unit: "pack",
    v: [["Pack of 5", null, "#4dabf7", 2500, 20_00, 200, false]] }),
  P({ slug: "sharpener-container", name: "Sharpener with Container", cat: "pencils", brand: "Doodle", shape: "sharpener", desc: "Sharp steel blade with a shaving box.", tags: ["sharpener"], gst: 18, hsn: "8214", unit: "piece",
    v: [["Blue", "Blue", "#4263eb", 1500, 12_00, 180, false]] }),
  P({ slug: "permanent-marker", name: "Permanent Marker", cat: "markers", brand: "Nibbs", shape: "marker", desc: "Waterproof bullet-tip marker for cartons, CDs and plastic.", tags: ["marker", "permanent", "felt tip"], gst: 18, hsn: "9608", unit: "piece",
    v: [["Black", "Black", "#2c3140", 3000, 25_00, 90, false], ["Blue", "Blue", "#1c7ed6", 3000, 25_00, 70, false], ["Red", "Red", "#e03131", 3000, 25_00, 60, false]] }),
  P({ slug: "whiteboard-marker", name: "Whiteboard Marker", cat: "markers", brand: "Nibbs", shape: "marker", desc: "Dry-erase ink that wipes clean without ghosting.", tags: ["whiteboard", "marker", "board"], gst: 18, hsn: "9608", unit: "piece",
    v: [["Black", "Black", "#343a40", 3500, 28_00, 80, false], ["Blue", "Blue", "#1971c2", 3500, 28_00, 70, false]] }),
  P({ slug: "highlighter-set-5", name: "Highlighter Set of 5", cat: "markers", brand: "Doodle", shape: "highlighter", desc: "Five pastel and fluorescent shades with chisel tips.", tags: ["highlighter", "study", "exam"], gst: 18, hsn: "9608", unit: "set",
    v: [["Set of 5", null, "#f59f00", 15000, 119_00, 45, true]] }),
  P({ slug: "wax-crayons-24", name: "Wax Crayons, 24 Shades", cat: "art", brand: "Doodle", shape: "crayon", desc: "Non-toxic, bright crayons for kids.", tags: ["crayons", "colour", "kids"], gst: 12, hsn: "9609", unit: "box",
    v: [["24 shades", null, "#e8590c", 9000, 72_00, 50, false]] }),
  P({ slug: "watercolour-12", name: "Watercolour Cake Set, 12", cat: "art", brand: "Doodle", shape: "paint", desc: "12 cakes with a brush, rich pigments that blend easily.", tags: ["watercolour", "paint", "art"], gst: 12, hsn: "3213", unit: "set", returnable: false,
    v: [["12 colours", null, "#7048e8", 14000, 109_00, 30, false]] }),
  P({ slug: "drawing-book-a4", name: "Drawing Book A4", cat: "art", brand: "Paperleaf", shape: "drawingbook", desc: "36 thick white sheets for sketching and colouring.", tags: ["drawing", "sketch", "a4"], gst: 12, hsn: "4820", unit: "piece",
    v: [["36 sheets", null, "#2f9e44", 6000, 48_00, 70, false]] }),
  P({ slug: "sketch-pens-24", name: "Sketch Pens, 24 Shades", cat: "art", brand: "Doodle", shape: "highlighter", desc: "Washable felt-tip sketch pens in 24 colours.", tags: ["sketch pens", "felt tip", "colour"], gst: 18, hsn: "9608", unit: "pack",
    v: [["24 shades", null, "#e64980", 12000, 95_00, 40, false]] }),
  P({ slug: "stapler-no10", name: "Stapler No. 10", cat: "office", brand: "Kohima Classics", shape: "stapler", desc: "Staples up to 20 sheets, metal body.", tags: ["stapler", "office"], gst: 18, hsn: "8472", unit: "piece",
    v: [["Blue", "Blue", "#1864ab", 9000, 69_00, 40, false]] }),
  P({ slug: "stapler-pins-no10", name: "Stapler Pins No. 10, Box", cat: "office", brand: "Kohima Classics", shape: "pins", desc: "1,000 pins per box.", tags: ["pins", "staples"], gst: 18, hsn: "7317", unit: "box",
    v: [["1,000 pins", null, "#495057", 2000, 15_00, 150, false]] }),
  P({ slug: "a4-copier-paper", name: "A4 Copier Paper, 500 Sheets", cat: "office", brand: "Paperleaf", shape: "paper", desc: "75 GSM bright white paper for printers and copiers.", tags: ["a4", "paper", "printer", "rim"], gst: 12, hsn: "4802", unit: "ream",
    v: [["500 sheets", null, "#1c7ed6", 39000, 310_00, 25, true]] }),
  P({ slug: "clear-file-folder-10", name: "Clear File Folders, Pack of 10", cat: "office", brand: "Doodle", shape: "folder", desc: "A4 button folders in assorted colours.", tags: ["file", "folder", "documents"], gst: 18, hsn: "3926", unit: "pack",
    v: [["Pack of 10", null, "#12b886", 15000, 120_00, 35, false]] }),
  P({ slug: "sticky-notes-3x3", name: "Sticky Notes 3x3, 3 Pads", cat: "office", brand: "Doodle", shape: "sticky", desc: "300 notes in three colours that peel off cleanly.", tags: ["sticky", "post it", "notes"], gst: 18, hsn: "4820", unit: "pack",
    v: [["3 pads", null, "#fab005", 9000, 69_00, 60, false]] }),
  P({ slug: "cash-book-200", name: "Cash Book Register, 200 Pages", cat: "account-books", brand: "Kohima Classics", shape: "register", desc: "Hard-bound cash book with printed columns.", tags: ["cash book", "register", "account"], gst: 12, hsn: "4820", unit: "piece",
    v: [["200 pages", null, "#7a4b2a", 22000, 180_00, 30, false]] }),
  P({ slug: "ledger-book", name: "Ledger Book, 300 Pages", cat: "account-books", brand: "Kohima Classics", shape: "register", desc: "Double-column ledger with index.", tags: ["ledger", "khata", "account"], gst: 12, hsn: "4820", unit: "piece",
    v: [["300 pages", null, "#5c3d2e", 32000, 265_00, 20, false]] }),
  P({ slug: "bill-book-duplicate", name: "Bill Book, Duplicate", cat: "account-books", brand: "Kohima Classics", shape: "billbook", desc: "50 sets with carbon, numbered pages.", tags: ["bill book", "invoice", "receipt"], gst: 12, hsn: "4820", unit: "piece",
    v: [["50 sets", null, "#c92a2a", 9000, 75_00, 40, false]] }),
  P({ slug: "geometry-box", name: "Geometry Box", cat: "exam", brand: "Nibbs", shape: "geometry", desc: "Compass, divider, protractor, set squares, scale and eraser.", tags: ["geometry", "compass", "maths", "exam"], gst: 18, hsn: "9017", unit: "piece",
    v: [["Blue", "Blue", "#1971c2", 15000, 125_00, 45, true]] }),
  P({ slug: "exam-clipboard", name: "Exam Clipboard", cat: "exam", brand: "Nibbs", shape: "clipboard", desc: "A4 board with a strong clip and a pen holder.", tags: ["exam pad", "clipboard", "board"], gst: 18, hsn: "3926", unit: "piece",
    v: [["Black", "Black", "#343a40", 12000, 89_00, 40, false]] }),
  P({ slug: "scale-30cm", name: "Clear Scale 30 cm", cat: "exam", brand: "Doodle", shape: "scale", desc: "Unbreakable flexible ruler with cm and inch markings.", tags: ["scale", "ruler"], gst: 18, hsn: "9017", unit: "piece",
    v: [["30 cm", null, "#228be6", 2000, 15_00, 120, false]] }),
  P({ slug: "waterproof-doc-folder", name: "Waterproof Document Folder", cat: "monsoon", brand: "Doodle", shape: "docfolder", desc: "Zip folder that keeps certificates dry in Kohima rains.", tags: ["waterproof", "rain", "folder", "documents"], seasonal: "monsoon", gst: 18, hsn: "3926", unit: "piece",
    v: [["Teal", "Teal", "#0ca678", 19000, 149_00, 30, true]] }),
  P({ slug: "zip-pouch-waterproof", name: "Waterproof Zip Pouch", cat: "monsoon", brand: "Doodle", shape: "pouch", desc: "Clear pencil pouch with a waterproof zip.", tags: ["pouch", "pencil case", "rain"], seasonal: "monsoon", gst: 18, hsn: "4202", unit: "piece",
    v: [["Sky", "Blue", "#1098ad", 8000, 59_00, 55, false]] }),
  P({ slug: "plastic-book-covers", name: "Plastic Book Covers, Pack of 10", cat: "monsoon", brand: "Paperleaf", shape: "cover", desc: "Thick, transparent covers that keep books dry.", tags: ["book cover", "rain", "school"], seasonal: "monsoon", gst: 18, hsn: "3926", unit: "pack",
    v: [["Pack of 10", null, "#15aabf", 7000, 55_00, 60, false]] }),
  P({ slug: "gift-pen-set", name: "Gift Pen Set", cat: "gifts", brand: "Kohima Classics", shape: "gift", desc: "Ball pen and roller pen in a gift box.", tags: ["gift", "pen set", "corporate"], gst: 18, hsn: "9608", unit: "set",
    v: [["Gift box", null, "#c2255c", 60000, 449_00, 15, true]] }),
  P({ slug: "kids-stationery-kit", name: "Kids Stationery Kit", cat: "gifts", brand: "Doodle", shape: "kit", desc: "Pencils, eraser, sharpener, scale and crayons in a carry box.", tags: ["kit", "kids", "return gift", "birthday"], gst: 12, hsn: "9609", unit: "set",
    v: [["Carry box", null, "#f76707", 25000, 199_00, 25, false]] }),
  P({ slug: "diary-2027", name: "Diary 2027", cat: "gifts", brand: "Paperleaf", shape: "diary", desc: "Day-per-page planner with a ribbon marker.", tags: ["diary", "planner", "2027", "new year"], gst: 12, hsn: "4820", unit: "piece",
    v: [["Navy", "Navy", "#1f2a6e", 35000, 279_00, 30, false], ["Wine", "Wine", "#862e4b", 35000, 279_00, 25, false]] }),
];

// ------------------------------------------------------------- write images + SQL
const q = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const arr = (a) => `array[${a.map(q).join(",")}]::text[]`;
let sql = `-- Dummy test catalogue for Gupta Ink. Generated by scripts/generate-catalog.mjs\n-- Safe to re-run: clears catalogue tables first.\n\n`;
sql += `delete from public.products; delete from public.product_groups; delete from public.categories;\ndelete from public.banners; delete from public.home_sections; delete from public.coupons where code in ('WELCOME50','INK10','FREEDEL');\n\n`;

for (const c of categories) {
  const file = `cat-${c.slug}.svg`;
  writeFileSync(join(outDir, file), svg(c.icon, c.color));
  sql += `insert into public.categories (name, slug, image_url, icon, sort) values (${q(c.name)}, ${q(c.slug)}, ${q("/catalog/" + file)}, ${q(c.icon)}, ${c.sort});\n`;
}
sql += "\n";

let n = 0;
for (const g of groups) {
  // Seed some popularity so "top rated", "most purchased" and "trending" have content
  n++;
  const rating = (3.8 + ((n * 37) % 12) / 10).toFixed(1);
  const ratingCount = 5 + ((n * 53) % 140);
  const sold = (n * 97) % 600;
  const views = (n * 211) % 2400;
  sql += `insert into public.product_groups (name, slug, description, category_id, brand, tags, returnable, seasonal_tag, rating_avg, rating_count, sold_count, view_count)
  select ${q(g.name)}, ${q(g.slug)}, ${q(g.desc)}, id, ${q(g.brand)}, ${arr(g.tags)}, ${g.returnable === false ? "false" : "true"}, ${q(g.seasonal ?? null)}, ${rating}, ${ratingCount}, ${sold}, ${views}
  from public.categories where slug = ${q(g.cat)};\n`;
  g.v.forEach(([label, colour, hex, mrp, price, stock, featured], i) => {
    const file = `${g.slug}-${i + 1}.svg`;
    writeFileSync(join(outDir, file), svg(g.shape, hex));
    const sku = `GI-${g.slug.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 10)}-${i + 1}`;
    sql += `insert into public.products (group_id, sku, variant_label, colour, colour_hex, unit, images, mrp_paise, price_paise, gst_rate, hsn, stock, featured, sort)
  select id, ${q(sku)}, ${q(label)}, ${q(colour)}, ${q(hex)}, ${q(g.unit)}, ${arr(["/catalog/" + file])}, ${mrp}, ${price}, ${g.gst}, ${q(g.hsn)}, ${stock}, ${featured}, ${i}
  from public.product_groups where slug = ${q(g.slug)};\n`;
  });
}

// Banners (generated art, linked to categories / products)
const banners = [
  { file: "banner-exam.svg", title: "Exam season, sorted", subtitle: "Geometry boxes, gel pens and clipboards at your door in under an hour", link_type: "category", link_value: "exam", c1: "#1f2a6e", c2: "#3f5bd8", shape: "geometry", color: "#ffd166" },
  { file: "banner-monsoon.svg", title: "Kohima rain? Keep it dry", subtitle: "Waterproof folders, pouches and book covers", link_type: "category", link_value: "monsoon", c1: "#0b7285", c2: "#15aabf", shape: "docfolder", color: "#e6fcf5" },
  { file: "banner-gifts.svg", title: "Gifts that get used", subtitle: "Pen sets, diaries and kids kits from ₹199", link_type: "category", link_value: "gifts", c1: "#a61e4d", c2: "#e64980", shape: "gift", color: "#ffe066" },
];
for (const [i, b] of banners.entries()) {
  writeFileSync(join(outDir, b.file), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 520" role="img">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${b.c1}"/><stop offset="1" stop-color="${b.c2}"/></linearGradient></defs>
  <rect width="1200" height="520" fill="url(#g)"/>
  ${Array.from({ length: 18 }, (_, k) => `<line x1="0" y1="${28 + k * 28}" x2="1200" y2="${28 + k * 28}" stroke="#fff" stroke-opacity=".07"/>`).join("")}
  <line x1="70" y1="0" x2="70" y2="520" stroke="#ff8787" stroke-opacity=".5" stroke-width="3"/>
  <g transform="translate(610 -60) scale(1.12)">${shapes[b.shape](b.color)}</g>
</svg>`);
  sql += `insert into public.banners (title, subtitle, image_url, placement, size, link_type, link_value, position) values (${q(b.title)}, ${q(b.subtitle)}, ${q("/catalog/" + b.file)}, 'hero', 'full', ${q(b.link_type)}, ${q(b.link_value)}, ${i});\n`;
}
// Mini promotions
const promos = [
  { title: "Ball pens from ₹10", link_type: "product", link_value: "ball-pen-07", bg: "#e8ebf8" },
  { title: "Office restock", link_type: "category", link_value: "office", bg: "#e6fcf5" },
  { title: "Art & colours", link_type: "category", link_value: "art", bg: "#f3f0ff" },
  { title: "Account books", link_type: "category", link_value: "account-books", bg: "#fff4e6" },
];
for (const [i, p] of promos.entries()) {
  sql += `insert into public.banners (title, image_url, placement, size, link_type, link_value, bg_color, position) values (${q(p.title)}, ${q("/catalog/cat-" + (p.link_type === "category" ? p.link_value : "pens") + ".svg")}, 'promo', 'half', ${q(p.link_type)}, ${q(p.link_value)}, ${q(p.bg)}, ${i});\n`;
}

sql += `
insert into public.home_sections (key, title, position, visible, config) values
  ('featured', 'Picked for you', 1, true, '{}'),
  ('top_discounts', 'Biggest savings', 2, true, '{}'),
  ('promos', 'Quick picks', 3, true, '{}'),
  ('categories', 'Shop by category', 4, true, '{}'),
  ('recent', 'Recently viewed', 5, true, '{}'),
  ('top_rated', 'Top rated', 6, true, '{}'),
  ('most_purchased', 'Most bought in Kohima', 7, true, '{}'),
  ('trending', 'Trending this week', 8, true, '{}'),
  ('seasonal', 'Monsoon ready', 9, true, '{"tag":"monsoon"}');

insert into public.coupons (code, title, description, type, value, max_discount_paise, min_order_paise, per_user_limit, first_order_only) values
  ('WELCOME50', '₹50 off your first order', 'On orders of ₹299 or more', 'flat', 5000, null, 29900, 1, true),
  ('INK10', '10% off, up to ₹100', 'On orders of ₹199 or more', 'percent', 10, 10000, 19900, 3, false),
  ('FREEDEL', 'Free delivery', 'No delivery fee on any order', 'free_delivery', 0, null, 9900, 2, false);
`;

writeFileSync(join(root, "supabase", "seed.sql"), sql);
console.log(`Wrote ${categories.length} categories, ${groups.length} product groups, ${groups.reduce((a, g) => a + g.v.length, 0)} variants.`);
