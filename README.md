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
- **The body is a generated 911** (`assets/911.glb`, 4.7 MB). It was made in Higgsfield: GPT Image 2.5 produced an unbadged studio reference image, and Tripo H3.1 turned it into a textured image-to-3D mesh. The internals (wheels, brakes, suspension, engine, transmission, exhaust, electrics) are built in code in `js/car.js` so they can come apart separately. The mesh's own baked-in wheels are cut away in a shader so the separate wheel parts show through.
- If the GLB fails to load, the page falls back to a coded body shell.
- The site also has a service menu, reasons to choose them, the brands they service, detailing and protection services, hours and location, and a booking form.

## Run locally

It's a static site with no build step:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Three.js r169 is vendored in `vendor/three/` (MIT, see its LICENSE), so the only external requests are for Google Fonts.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page content: every teardown chapter lives here as an `<article data-stage>` |
| `styles.css` | Layout and theme (tokens are in `:root`) |
| `js/app.js` | Scene, lighting, scroll timeline, camera shots, callouts, booking form |
| `js/car.js` | Car model split into explodable service parts, plus `useBody()`, which fits the generated 911 body |
| `assets/911.glb` | Generated 911 body (Higgsfield / Tripo H3.1) |

### Tuning the teardown

- `SHOTS` in `js/app.js`: the camera position and target for each chapter.
- `STAGE_PART` in `js/app.js`: which part each chapter pulls out.
- The `add(name, obj, offset)` calls at the bottom of `js/car.js`: how far and in which direction each part moves when exploded.
- The height of `.teardown` in `styles.css` (`1000vh`): how much scrolling the teardown takes.
- `BODY` in `js/car.js`: the scale and the measured wheel positions for the generated body. If you swap in a different model, re-measure these.

## Notes and to-dos before launch

- **Model weight:** the GLB is 4.7 MB. Before launch, compress it (for example with gltf-transform's meshopt and texture resizing) to speed up first load.
- **The car is a generic, unbadged 911.** Don't add Porsche crests or logos without checking the client's rights to use them.
- **Booking form** has no backend. It opens a pre-filled email to `service@intersportperformance.com`. Connect it to the shop's scheduling tool or CRM.
- **Copy** is drawn from intersportperformance.com (services, brands, hours, the 30% savings claim, pick-up and delivery, the lockbox). Have the client confirm it, especially hours: their site lists slightly different showroom and service hours.
- The phone number is (703) 574-9383, as shown on their current homepage. Some older pages list (703) 242-8680.
- If WebGL is unavailable, the chapters render as a normal stacked page. `prefers-reduced-motion` disables the sway and smoothing.
