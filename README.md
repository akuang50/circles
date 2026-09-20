# Circles

Small-group logistics without the public ask. One app for a household, a class, and an event buddy — built on a shared **Circles + Members + Signals** core. You only see someone else's signal after you have opted in too.

v1: join codes only, one app instance, manual course join codes, view-time expiry, and a local Firebase fallback when credentials are missing.

## Run locally

```bash
npm install
npm run dev
```

The Vite dev server binds to **http://127.0.0.1:4733**. Open that URL. Without Firebase env vars the app uses an in-browser store (localStorage) so you can use every module immediately.

### Try the demo house

1. Continue with a name.
2. On the empty circles screen, choose **Load the Oak Street demo**.
3. That creates **Oak Street house** (logistics, who's where, meetings, sightings) and **6.006 recitation** (free tonight, study groups, who's where, psets, meetings, sightings), plus campus events.
4. Open **Who's where** — Maya and Priya are checked into named places at the house; Jonah is at the library for 6.006. Tap a place to check in yourself. There is no GPS prompt.
5. In 6.006, open **Psets** — Maya and Jonah are on Pset 3. Mark yourself as working on it.
6. **Meetings & clubs** is optional; the demo lists a couple of items. Leave it empty on a real circle if you want.
7. In Oak Street, open **Sightings** for the dirty bathroom and mice posts (names on, circle-only).
8. Maya and Jonah have also opted into "free tonight" and a Quiz 2 review. You will not see those until you opt in too.
9. On **You**, switch to Maya or Jonah on this browser to confirm the other side of a match.

If you already loaded an older demo on this browser, load it again (or toggle modules on the circle home) so the new boards appear.

```bash
npm test          # matching / privacy unit tests
npm run build     # production bundle in dist/
npm run preview   # serve dist/ on port 4733
```

## Configure Firebase

1. Create a Firebase project (Spark plan is enough).
2. Enable **Authentication → Email/Password** and **Cloud Firestore**.
3. Copy `.env.example` to `.env.local` and fill in the web app config values.
4. Deploy rules and indexes from this repo:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

`firestore.rules` enforces mutual-match privacy on the server: `free_tonight_signals`, `study_requests`, and `event_buddy_requests` are readable for another person only if the requester has their own matching opt-in. Matching helpers live in `src/core/matching.ts` and are shared by every mutual-opt-in module.

Named-place check-ins (`presence_checkins`), psets, meetings, and sightings are **circle-member readable** after someone explicitly posts or checks in — not private-until-matched, and not public. Presence never stores coordinates.

If the env vars are absent, Circles keeps using the local fallback. Nothing else is required.

GitHub Pages deploys can pass the same `VITE_FIREBASE_*` values as repository Actions secrets.

## Deploy (GitHub Pages)

Live URL after the first successful Actions run on `main`:

**https://akuang50.github.io/circles/**

GitHub repo: **https://github.com/akuang50/circles**. Create it empty (no README, .gitignore, or license) so it does not collide with the README this tree already ships.

On every push to `main`, `.github/workflows/deploy.yml` builds the Vite app and deploys `dist/` with official GitHub Pages Actions (`actions/deploy-pages`). That workflow enables Pages; you should not need to pick a `gh-pages` branch by hand.

Firebase is optional. If `VITE_FIREBASE_*` Actions secrets are unset, the hosted build uses the in-browser fallback (same as local). To wire a real project later, add these repository secrets (none are required for the demo):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

The workflow sets `VITE_BASE_PATH` to `/circles/` so the app works at https://akuang50.github.io/circles/. SPA refreshes copy `index.html` to `404.html` during the Vite build.

## What v1 includes

| Module | Where | Shape |
| --- | --- | --- |
| Household logistics | Circle module | Dinner board, grocery claim list, common-room week strip |
| Who's where | Circle module | Named-place check-in (library, dining hall, dorm, class building, home, out, or custom). Explicit opt-in, circle-scoped, 2h / 4h / until-cleared view-time expiry. No GPS, no live map. |
| Psets | Circle module (campus) | Manual pset list + who is working on each. No Canvas/LMS scrape. |
| Meetings & clubs | Circle module | Optional office hours / rehearsal / club listings. Empty is normal. No Google Calendar. |
| Sightings | Circle module | Circle-only posts (dirty, pest, broken, other). Named poster, newest first. |
| Free tonight | Circle module | One toggle; mutual list; view-time end-of-day expiry |
| Study groups | Circle module | Session + windows; auto-group on overlap (2–5 people) |
| Event buddy | Campus-wide, not circle-scoped | Opt in per event; pair/trio + meetup note |

Phase 5 (Cloud Functions for exact midnight expiry, receipt split, chore rotation) is intentionally out of v1.
