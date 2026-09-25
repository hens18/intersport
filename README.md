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
- The model is built entirely in code (`js/car.js`), so there are no 3D asset files and no licensing to manage.
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
| `js/car.js` | Procedural car model, split into explodable service parts |

### Tuning the teardown

- `SHOTS` in `js/app.js`: the camera position and target for each chapter.
- `STAGE_PART` in `js/app.js`: which part each chapter pulls out.
- The `add(name, obj, offset)` calls at the bottom of `js/car.js`: how far and in which direction each part moves when exploded.
- The height of `.teardown` in `styles.css` (`1000vh`): how much scrolling the teardown takes.

## Notes and to-dos before launch

- **Booking form** has no backend. It opens a pre-filled email to `service@intersportperformance.com`. Connect it to the shop's scheduling tool or CRM.
- **Copy** is drawn from intersportperformance.com (services, brands, hours, the 30% savings claim, pick-up and delivery, the lockbox). Have the client confirm it, especially hours: their site lists slightly different showroom and service hours.
- The phone number is (703) 574-9383, as shown on their current homepage. Some older pages list (703) 242-8680.
- If WebGL is unavailable, the chapters render as a normal stacked page. `prefers-reduced-motion` disables the sway and smoothing.
