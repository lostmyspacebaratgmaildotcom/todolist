# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Apartment Reset is a mobile-first Next.js 16 app (React 19, TypeScript 6, Tailwind CSS 4) for apartment cleaning routines. It is 100% client-side with all data stored in browser `localStorage` — no database, no backend API, no authentication.

### Development commands

Standard `package.json` scripts:

- `npm run dev` — Start dev server (port 3000)
- `npm run build` — Production build
- `npm run lint` — Run ESLint
- `npm start` — Serve production build

### Key notes

- **No external services required.** No database, Redis, Docker, or environment variables needed.
- **Data persistence:** All user data lives in browser `localStorage`. Clearing browser data resets app state.
- **Port:** Dev server runs on port 3000 by default.
- **No test suite:** The project has no automated test framework configured (no Jest, Vitest, etc.). Validation is done via lint + build + manual testing.
- **Product rules:** The app explicitly avoids authentication, databases, Google sync, payments, or external services unless explicitly requested (see `docs/prd.md` and `.cursor/rules/product.mdc`).
