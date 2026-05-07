# Apartment Reset

Apartment Reset is a mobile-first cleaning routine app for apartment living. It is
based on the PRD in `docs/prd.md` and implements the no-login MVP:

- public starter templates
- Today screen with morning, afternoon, and evening checklists
- independent completion scores for each block
- localStorage persistence by local cleaning day
- multiple apartment zones selectable for today's checklist
- zone scheduling reminders and schedule-for-tomorrow actions
- 15-minute zone timer
- local routine management for adding/removing zones and tasks
- Settings controls for reset time and local data clearing

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Quality checks

```bash
npm run lint
npm run build
```
