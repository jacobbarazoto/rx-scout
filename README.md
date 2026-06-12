# rx-scout

Find which pharmacies near you are likely to have your prescription — with **real
FDA drug-shortage data** layered on top of a nearby-pharmacy locator.

> **On "in stock":** there is no public, real-time API for per-store prescription
> inventory (CVS, Walgreens, and GoodRx all gate or simply don't expose it). So
> rx-scout pairs **real** national shortage data with a clearly-labeled
> **simulated** per-pharmacy stock layer. Stock badges are deterministic and skew
> toward scarcity when a drug is in a genuine FDA shortage, keeping the demo honest
> and internally consistent.

## What's real vs. simulated

| Data | Source | Real? |
|------|--------|-------|
| Medication search / autocomplete | [RxNorm / RxNav](https://rxnav.nlm.nih.gov) (NLM) | ✅ real, no key |
| National drug shortage status | [openFDA Drug Shortages](https://open.fda.gov/apis/drug/drugshortages/) | ✅ real, no key |
| ZIP → location | [zippopotam.us](https://api.zippopotam.us) | ✅ real, no key |
| Nearby pharmacies | Google Places (when a key is set) | ✅ real *(optional)* |
| Per-pharmacy stock levels | deterministic simulation | ⚠️ simulated |

## Tech stack

- **React 18 + TypeScript + Vite** (the original Create React App scaffold was
  broken — incompatible `react-scripts`, wrong Maps package — and was rebuilt).
- **Google Maps** via `@vis.gl/react-google-maps` — *optional*. With no key, the
  app runs entirely on mock pharmacy data and skips the map.
- **Firebase Hosting** for deployment.

The previous React + Django prototype is archived under [`legacy/`](legacy/).

## Run locally

```sh
cd web
npm install
npm run dev          # http://localhost:5173
```

Everything works with **zero configuration**. To enable the real map + real nearby
pharmacies, copy `web/.env.example` to `web/.env` and add a Google Maps JavaScript
API key (Places library enabled, restricted by HTTP referrer).

```sh
npm run build        # typecheck + production build → web/dist
```

## Deploy to Firebase Hosting

One-time setup:

```sh
npm install -g firebase-tools   # or use: npx firebase-tools <cmd>
firebase login
```

The project is already wired to the `rx-scout` Firebase project (see `.firebaserc`).
Then, from the repo root:

```sh
cd web && npm run build && cd ..
firebase deploy --only hosting
```

## Project layout

```
web/                 React + Vite app
  src/lib/           data layer (rxnorm, openfda, geo, pharmacies, availability)
  src/components/    UI (SearchBar, ShortageBanner, PharmacyList, MapView, Header)
firebase.json        Firebase Hosting config (serves web/dist as an SPA)
.firebaserc          → Firebase project "rx-scout"
legacy/              archived original CRA + Django prototype
```
