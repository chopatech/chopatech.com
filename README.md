# Mihayo's Safaris — Website

A multilingual (English / Kiswahili / Español / Français), responsive
marketing site for a Tanzania safari & Zanzibar travel operator.

## What's included

- `index.html` — Home: hero, search bar, featured destinations, national
  parks, why-choose-us, packages, testimonials, blog teaser, gallery, CTA
- `about.html` — History, mission/vision/values, team, conservation
- `destinations.html` — Filterable region-by-region destination cards
  (Northern & Southern Circuit, Western Tanzania, Coast & Islands,
  Mountains & Lakes) + a Great Migration calendar section
- `safaris.html` — Filterable safari packages (length, luxury/budget,
  family, honeymoon) + a sample day-by-day itinerary and map
- `kilimanjaro.html` — All 7 climbing routes compared, porter welfare
  note, FAQ accordion
- `zanzibar.html` — Beaches, islands, and activities
- `blog.html` — Field-journal style article listing
- `contact.html` — Validated enquiry form, office info, Google Maps embed
- `css/style.css`, `css/responsive.css` — design system + breakpoints
- `js/translations.js` — all UI copy in 4 languages
- `js/i18n.js` — applies `data-i18n` / `data-i18n-ph` translations
- `js/main.js` — navbar state, mobile nav, filters, FAQ, lightbox, forms,
  cookie banner, back-to-top, currency converter demo
- `js/darkmode.js` — light/dark theme toggle
- `sitemap.xml`, `robots.txt` — basic SEO scaffolding
- Schema.org `TravelAgency` structured data on the homepage
- Open Graph / Twitter Card meta tags on every page

## Design concept

"Field Journal / Topographic Survey" — GPS-coordinate eyebrows and
stamped destination cards (like a ranger's logbook) plus thin contour-line
dividers (like a cartographer's map), instead of generic numbered steps.
Palette follows your brief exactly (#0B6E4F / #FFD166 / #EF476F / #F8F9FA
/ #222) with derived sand/neutral tones added for cards and dark mode.

## Honest scope notes — read before handing this to a client

1. **Placeholder photography.** Every image uses `picsum.photos` seeded
   placeholders (real photos, random subject) since I can't source or
   license actual Tanzania photography for you. Swap the `src` URLs in
   each `<img>` tag for your own licensed photos before launch — search
   for `picsum.photos/seed/` to find every instance quickly.
2. **No literal video file.** The hero uses a still image with a
   gradient overlay in place of "fullscreen hero video." Drop an
   `.mp4`/`.webm` into `videos/` and swap the `.hero` background in
   `style.css` for a `<video>` tag — the CSS is already structured for it.
3. **Language switching is in-memory only, per page.** Browser storage
   (localStorage/sessionStorage) was intentionally avoided, so the
   language resets to English on every page load/navigation. To persist
   it site-wide, wire `setLang()` in `js/i18n.js` to a cookie or a small
   backend session once you have a server.
4. **Not every single destination in your brief has its own page.**
   Your prompt listed 100+ named places (every waterfall, every beach,
   every ethnic group). Building a genuinely good, unique page for each
   would run to hundreds of files — instead, `destinations.html` covers
   every region and roughly 20 flagship destinations with filtering, and
   is built so you (or a developer) can duplicate a `.dest-card` block
   for any additional place in minutes.
5. **Forms are front-end only.** The contact form and newsletter signup
   validate and show a success state in the browser, but don't actually
   send anywhere yet — wire them to EmailJS, a form backend (e.g.
   Formspree), or your own API endpoint.
6. **Google Maps embeds use placeholder `embed` URLs.** Replace the
   `iframe src` in `contact.html` and `safaris.html` with your real
   Google Maps "Embed a map" link and a valid API key if you upgrade to
   the JS API.
7. **No payment integration, admin dashboard, AI chat widget, or user
   accounts.** These are real backend features (payments especially need
   a PCI-compliant provider like Stripe/Flutterwave) — this build is the
   front-end marketing site they'd sit behind.

## Extending to full-stack

The HTML/CSS/JS here has no framework lock-in, so it drops cleanly into:
- A Node/Express or Django backend serving these as templates
- A headless CMS (e.g. Strapi, Sanity) feeding the destination/package/
  blog cards dynamically instead of hard-coded HTML
- EmailJS (client-side) or a serverless function (server-side) for the
  contact form
