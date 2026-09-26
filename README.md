# Intersport Performance: service site

A marketing site for Intersport Performance (Ashburn, VA) that puts their European **service & repair** work first and keeps car sales in the background.

## What's here

- **3D hero + scroll teardown**: a real-time Three.js scene. As you scroll, the car comes apart chapter by chapter, and each chapter ties a component to a service:
  1. Body lifts off: multi-point inspection
  2. Wheels & tires
  3. Brakes
  4. Steering & suspension
  5. Engine (flat-six, with its cylinder banks and intake exploded)
  6. Transmission & drivetrain
  7. Exhaust
  8. Diagnostics, cooling & climate (ECU, wiring, radiators, HVAC)
  9. Reassembly and a call to action
- **The body is a generated 911** (`assets/911.glb`, 0.8 MB after compression). It was made in Higgsfield: GPT Image 2.5 produced an unbadged studio reference image, and Tripo H3.1 turned it into a textured image-to-3D mesh. The internals (wheels, brakes, suspension, engine, transmission, exhaust, electrics) are built in code in `js/car.js` so they can come apart separately. The mesh's own baked-in wheels are cut away in a shader so the separate wheel parts show through.
- If the GLB fails to load, the page falls back to a coded body shell.
- The site also has a service menu, reasons to choose them, Google reviews, the brands they service, detailing and protection services, hours and location, and a booking form.
- There's a mobile menu, a custom 404 page, a favicon set, and social-sharing tags with a preview image.

## Run locally

It's a static site with no build step:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Three.js r169 is vendored in `vendor/three/` (MIT, see its LICENSE), along with the meshopt decoder, so the only external requests are for Google Fonts.

**Deploy at the root of the domain.** `404.html` uses root-relative paths (`/styles.css`) so it works at any missing URL. Most hosts (Netlify, Vercel, Cloudflare Pages, GitHub Pages with a custom domain) serve `404.html` automatically; on Apache or nginx, point the error page at it.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Home page: every teardown chapter lives here as an `<article data-stage>` |
| `404.html` | Custom "page not found" page (shares the header, menu and footer) |
| `styles.css` | Layout and theme for both pages (tokens are in `:root`) |
| `js/site.js` | Page UI with no dependencies: mobile menu, header state, footer year, chapter buttons, booking form validation and messages, reviews marquee |
| `js/app.js` | 3D scene only: lighting, scroll timeline, camera shots, callouts, free-look controls |
| `js/car.js` | Car model split into explodable service parts, plus `useBody()`, which fits the generated 911 body |
| `assets/911.glb` | Generated 911 body (Higgsfield / Tripo H3.1), compressed with meshopt and WebP textures |
| `assets/og-image.jpg` | 1200×630 image shown when the site is shared |
| `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `site.webmanifest` | Tire-logo favicon set |

### Tuning the teardown

- `SHOTS` in `js/app.js`: the camera position and target for each chapter.
- `STAGE_PART` in `js/app.js`: which part each chapter pulls out.
- The `add(name, obj, offset)` calls at the bottom of `js/car.js`: how far and in which direction each part moves when exploded.
- The height of `.teardown` in `styles.css` (`1000vh`): how much scrolling the teardown takes.
- `BODY` in `js/car.js`: the scale and the measured wheel positions for the generated body. If you swap in a different model, re-measure these.

## Notes and to-dos before launch

- **Model weight:** the GLB was compressed from 4.7 MB to 0.8 MB (meshopt geometry, WebP textures, the detail maps at 1024 px). To recompress a replacement model: `npx @gltf-transform/cli webp in.glb tmp.glb && npx @gltf-transform/cli meshopt tmp.glb assets/911.glb`.
- **The car is a generic, unbadged 911.** Don't add Porsche crests or logos without checking the client's rights to use them.
- **Booking form:** set `data-endpoint` on `<form id="book">` to a form service URL (for example a Formspree form, which accepts this form's fields and its `_gotcha` spam trap). The form then posts there and shows a success or error message. With no endpoint it opens a pre-filled email to `service@intersportperformance.com` and tells the visitor to press send.
- **Domain:** the canonical URL, social tags and structured data assume `https://www.intersportperformance.com/`. Change them in `index.html` if the site launches elsewhere.
- **Privacy policy and inventory links** point to pages on the current intersportperformance.com site. Move those pages over, or update the links, when this site replaces it.
- **Copy** is drawn from intersportperformance.com (services, brands, hours, the 30% savings claim, pick-up and delivery, the lockbox). Have the client confirm it, especially hours: their site lists slightly different showroom and service hours.
- The phone number is (703) 574-9383, as shown on their current homepage. Some older pages list (703) 242-8680.
- If WebGL is unavailable, the chapters render as a normal stacked page. `prefers-reduced-motion` disables the sway and smoothing.
