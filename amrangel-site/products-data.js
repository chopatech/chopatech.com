/* ============================================================
   AMRANGEL — Apothecary Product Catalog
   Single source of truth, consumed by /products/index.html
   (shop grid) and individual product detail pages.

   NOTE: placeholder catalog. Replace name/price/description/
   image with your real products and photography.
  ============================================================ */

window.AMRANGEL_PRODUCTS = [
  {
    id: "shea-marula-balm",
    name: "Shea & Marula Barrier Balm",
    category: "Skin",
    price: 18.00,
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=900&q=80&auto=format&fit=crop",
    short: "A dense, slow-melt balm for dry or compromised skin barriers.",
    description: "Built around unrefined shea butter and cold-pressed marula oil at a working 70/30 ratio, this balm is formulated for skin barriers under stress — post-shave, post-sun, or simply dry season. It sits heavy on purpose: a thin layer goes a long way, and it's designed to be the last step in a routine, not the first.",
    ingredients: ["Unrefined shea butter (70%)", "Cold-pressed marula oil (25%)", "Vitamin E", "No fragrance, no fillers"],
    use: "Warm a pea-sized amount between palms and press into skin. Best applied to slightly damp skin, at night or after sun exposure."
  },
  {
    id: "argan-castor-scalp-oil",
    name: "Argan & Castor Scalp Oil",
    category: "Hair",
    price: 22.00,
    image: "https://images.unsplash.com/photo-1556228852-80f6e8e6b56e?w=900&q=80&auto=format&fit=crop",
    short: "A pre-wash treatment oil for scalp health and hair density.",
    description: "Argan oil carries the active load here — fatty acids that condition strand and scalp alike — cut with castor oil for its thickness and traditional use around hair density. Applied as a pre-wash treatment, left 20–30 minutes before shampooing.",
    ingredients: ["Cold-pressed argan oil (60%)", "Castor oil (35%)", "Rosemary extract", "No silicones, no mineral oil"],
    use: "Section hair and massage into scalp. Leave 20–30 minutes (or overnight under a cap), then shampoo out thoroughly. Use 1–2x weekly."
  },
  {
    id: "rosehip-tone-serum",
    name: "Rosehip Tone & Texture Serum",
    category: "Skin",
    price: 26.00,
    image: "https://images.unsplash.com/photo-1626015449342-2b6b13bf6b7b?w=900&q=80&auto=format&fit=crop",
    short: "Lightweight, single-ingredient-led serum for tone and texture.",
    description: "Cold-pressed rosehip seed oil, used at full concentration with no carrier dilution. It's thin enough to layer under a moisturizer and is formulated for those targeting uneven tone, surface texture, or early fine lines without introducing actives that need patch-testing.",
    ingredients: ["100% cold-pressed rosehip seed oil", "Naturally occurring vitamin A & C", "No synthetic fragrance"],
    use: "After cleansing, press 3–4 drops into skin before moisturizer. AM or PM. Patch test recommended for first use."
  },
  {
    id: "aloe-oat-cream",
    name: "Aloe & Oat Sensitive Cream",
    category: "Skin",
    price: 19.00,
    image: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=900&q=80&auto=format&fit=crop",
    short: "A fragrance-free daily moisturizer for reactive or sensitive skin.",
    description: "Built specifically for skin that reacts to most things: colloidal oat for barrier support, aloe for a light cooling base, and nothing else added for scent or shelf appeal. This is the product we recommend first in a Skin & Hair consultation when someone says 'everything irritates me.'",
    ingredients: ["Aloe vera leaf juice", "Colloidal oat", "Glycerin", "No fragrance, no essential oils, no dyes"],
    use: "Apply to clean skin morning and night. Safe for daily use on face and body."
  },
  {
    id: "coconut-deep-mask",
    name: "Coconut & Honey Deep Hair Mask",
    category: "Hair",
    price: 24.00,
    image: "https://images.unsplash.com/photo-1571875257727-256c39da42af?w=900&q=80&auto=format&fit=crop",
    short: "Weekly intensive mask for dry, color-treated, or heat-damaged hair.",
    description: "A heavier weekly treatment for hair that's seen too much heat or color processing. Raw honey draws and holds moisture; coconut oil seals it in. Best used once a week as a deep-condition step, not a daily leave-in.",
    ingredients: ["Virgin coconut oil", "Raw honey", "Shea butter", "Aloe vera"],
    use: "Apply generously to damp, towel-dried hair, focusing on mid-lengths to ends. Leave 20 minutes under a warm towel, then rinse and shampoo lightly."
  },
  {
    id: "lavender-clay-cleanser",
    name: "Lavender Clay Gel Cleanser",
    category: "Skin",
    price: 16.00,
    image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=900&q=80&auto=format&fit=crop",
    short: "A gentle daily cleanser with a trace of kaolin clay for oil control.",
    description: "A low-foam gel cleanser for daily use, with a small amount of kaolin clay included for those managing combination or oily skin without over-stripping. Lavender is used at a low, non-sensitizing concentration for scent only.",
    ingredients: ["Aloe vera base", "Kaolin clay (trace)", "Lavender essential oil (0.3%)", "Coco-glucoside (gentle surfactant)"],
    use: "Massage onto damp skin morning and night, rinse with lukewarm water. Follow with serum and moisturizer."
  }
];
