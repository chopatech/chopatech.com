# Amrangel — Setup Guide

This site is fully built and wired for real form submissions, a working
shopping cart, and multi-page navigation. There is exactly **one step**
left before the newsletter, consult booking, enrollment, and order
forms actually deliver email to **chopatechtz@gmail.com**.

## 1. Activate form delivery (3 minutes)

1. Go to **https://formspree.io** and sign up for a free account using
   `chopatechtz@gmail.com`.
2. Click **"+ New Form"**, name it anything (e.g. "Amrangel Site"), and
   set the delivery email to `chopatechtz@gmail.com`.
3. Formspree will give you a form endpoint that looks like:
   `https://formspree.io/f/abcdwxyz`
4. Open **`assets-shared.js`** in the root folder, find this line near
   the top:

   ```js
   const FORMSPREE_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";
   ```

   Replace `YOUR_FORM_ID` with your real ID (e.g. `abcdwxyz`).
5. Save the file. Every form on every page — newsletter signup, consult
   booking modal, Académie enrollment, and order checkout — now points
   to this one endpoint automatically (the script rewrites any leftover
   `YOUR_FORM_ID` placeholders it finds in the HTML at page load).
6. **Important:** the first real submission triggers a one-time
   confirmation email from Formspree to `chopatechtz@gmail.com`. You
   must click the confirmation link before submissions start arriving —
   test the newsletter form once after setup to trigger this.

Free Formspree accounts handle 50 submissions/month, which is plenty to
start. You can upgrade later if volume grows.

## 2. What's already real vs. what's a placeholder

**Fully functional, no further setup needed:**
- Mobile menu, header scroll state, smooth scroll
- Shopping cart (add/remove/quantity, persisted in the browser via
  localStorage, syncs across all pages)
- Product detail pages (dynamic — driven by `products-data.js`)
- Form validation, loading states, success/error messaging
- The interactive Atelier construction simulation

**Functional once you complete Step 1 above:**
- Newsletter signup (homepage)
- "Book a Consult" modal (every page)
- Académie enrollment form
- Apothecary checkout / order request form

**Placeholder content you should replace with your own:**
- Product names, prices, ingredients, and descriptions in
  `products-data.js`
- Course names, pricing, and schedule in `academie/index.html`
- Instructor names/bios/photos in `academie/index.html`
- Machine specs in the Materials table (`studio/index.html`)
- All photography — currently sourced from Unsplash's free-license
  library. Swap any `images.unsplash.com` URL for your own product and
  runway photography when ready.
- Studio location, careers, and press links in the footer (currently
  `#` placeholders)

## 3. About checkout

There is no live payment processing (no Stripe, PayPal, etc. wired in).
The "Request Order" flow at `/products/checkout.html` sends your cart
contents as a formatted order inquiry — you confirm stock and arrange
payment manually by replying to the customer's email. This is
intentional: building real payment processing requires a merchant
account and processor keys only you can set up. If you want a live
checkout later (Stripe Checkout is the simplest path), that's a
follow-on project once you have a Stripe account.

## 4. File structure

```
/
├── index.html              ← homepage (hub)
├── assets-shared.css       ← shared design system, used by every page
├── assets-shared.js        ← shared cart/nav/form logic, used by every page
├── products-data.js        ← single source of truth for the shop catalog
├── academie/index.html     ← curriculum, instructors, enrollment
├── products/
│   ├── index.html          ← shop grid
│   ├── product.html        ← dynamic product detail (?id=...)
│   └── checkout.html       ← cart summary + order request form
├── runway/index.html       ← collection lookbooks
└── studio/index.html       ← consultation booking + materials table
```

Because pages share `assets-shared.css` / `.js` / `products-data.js`,
editing the catalog or design tokens in one place updates the whole
site — no need to touch every page individually.
