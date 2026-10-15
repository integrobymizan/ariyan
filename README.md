# Ariyan — AI automation agency website

A single-page marketing site with a live 3D hero: a workflow graph where client apps (CRM, Inbox, Invoices, Slack…) send data into a central AI core, and results flow back out.

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
assets/js/scene.js      Three.js workflow graph (hero background)
assets/js/main.js       Run log, card tilt, ROI calculator, contact form
```

## Customise

| What | Where |
| --- | --- |
| Brand name, copy, sections | `index.html` |
| Colours and fonts | `:root` tokens at the top of `assets/css/styles.css` |
| Apps shown in the 3D graph | `APPS` array in `assets/js/scene.js` |
| Sample run log lines | `RUNS` array in `assets/js/main.js` |
| ROI assumptions (46 weeks, 37.5h week) | `WEEKS` / `FTE_HOURS` in `assets/js/main.js` |
| Contact email | `#contact-email` in `index.html` |
| Contact form destination | `FORM_ENDPOINT` in `assets/js/main.js` |

### Connecting the contact form

The form posts JSON (`name`, `email`, `company`, `size`, `task`) to `FORM_ENDPOINT`. Until that is set it tells visitors to email you instead. Any service that accepts a JSON POST works: Formspree, Basin, a Netlify/Vercel function, or a CRM/n8n/Make webhook.

## Deploy

Any static host works. Drag the folder into Netlify, import the repo in Vercel, or enable GitHub Pages on this branch.

## Accessibility and performance

- `prefers-reduced-motion` freezes the 3D scene to a still frame and stops the marquee, log and pipeline animations.
- The scene pauses when the tab is hidden and caps pixel ratio at 2.
- If WebGL is unavailable the canvas is removed and the page still works.
