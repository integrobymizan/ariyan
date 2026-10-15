# Omni AI Builders website

A single-page 3D marketing site for Omni AI Builders.

- **3D website helper:** "Omni", a glossy robot guide with a headset, visor face, blinking eyes and a voice-waveform mouth, built entirely in Three.js (no model files). It flies to open space beside each section, follows the cursor with its head, waves, points at content, and types a line into a speech bubble for each section. Click it for a spin. On phones it greets you above the hero, then rides along as a small corner companion.
- **Talking guide:** when someone visits, Omni flies in, opens a chat and asks whether they run a local business or an agency and what's costing them most. It recommends the right service (or shows all eleven) and opens that service's detail page. Optional voice uses the browser's speech synthesis, with the robot's mouth moving as it talks. The chosen service is pre-selected in the contact form.
- **Service detail pages:** one page per service in `services/`, each with what's included, how it works, who it's for, FAQs and related services. The agent guides visitors down these pages too.
- **3D services carousel:** eleven service cards on a rotating ring you can drag, step through, filter or use with the keyboard. It becomes a plain grid below 900px.
- Cursor glow, scroll progress bar, 3D tilt panels, missed-lead calculator.

Plain HTML, CSS and JavaScript. No build step. [Three.js](https://threejs.org/) r128 loads from cdnjs.

## Run locally

Open `index.html` in a browser, or serve the folder:

```sh
npx serve .
# or
python3 -m http.server 8080
```

## Structure

```
index.html              Page content and sections
assets/css/styles.css   Design tokens (top of file) and all styles
assets/js/scene.js      Three.js 3D AI agent: model, poses, flight path and speech bubble
assets/js/main.js       Run log, 3D carousel, filters, calculator, cursor, contact form
assets/js/chat.js       Omni's conversation: greeting, questions, recommendations
assets/js/services-data.js  Generated service list used by the chat
data/services.json      All service content (single source of truth)
services/*.html         Generated service detail pages
tools/build_services.py Regenerates services/*.html and services-data.js
```

## Editing services

All service copy lives in `data/services.json`: names, descriptions, features, steps, FAQs, related services, what Omni says, and the problem each service answers in the chat. After editing it, run:

```sh
python3 tools/build_services.py
```

This rewrites `services/*.html` and `assets/js/services-data.js`. Don't edit the generated files by hand.

## Customise

| What | Where |
| --- | --- |
| Brand name, copy, services, sections | `index.html` |
| Colours and fonts | `:root` tokens at the top of `assets/css/styles.css` |
| Where the agent stands per section | `data-agent` on each section, `LAYOUT` in `assets/js/scene.js` |
| What the agent says per section | `data-agent-line` on a section, or `LINES` in `assets/js/scene.js` |
| The chat conversation | `startHome`, `forBusiness`, `forAgency` in `assets/js/chat.js` |
| Agent gestures (wave, present, think) | `POSE` in `assets/js/scene.js` |
| Sample run log lines | `RUNS` array in `assets/js/main.js` |
| Missed-lead calculator maths | `calc()` in `assets/js/main.js` |
| Contact email | `#contact-email` in `index.html` |
| Contact form destination | `FORM_ENDPOINT` in `assets/js/main.js` |

### Connecting the contact form

The form posts JSON (`name`, `email`, `phone`, `type`, `service`, `task`) to `FORM_ENDPOINT`. Until that is set it tells visitors to email you instead. Any service that accepts a JSON POST works: Formspree, Basin, a Netlify/Vercel function, or a GoHighLevel inbound webhook (so enquiries land straight in your pipeline).

## Deploy

Any static host works. Drag the folder into Netlify, import the repo in Vercel, or enable GitHub Pages on this branch.

## Accessibility and performance

- `prefers-reduced-motion` keeps the agent still (no bobbing, waving or typing) and stops the marquee, log and pipeline animations.
- The scene pauses when the tab is hidden and caps pixel ratio at 2.
- If WebGL is unavailable the canvas is removed and the page still works.
