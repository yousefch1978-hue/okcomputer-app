# OKComputer shared-backend build

This package is a GitHub-ready version of your uploaded project.

## What is fixed in this build
- shared backend instead of browser-only localStorage for core app data
- refresh-safe routing for the main app flow
- persistent login using a saved session token
- admin can review deposits, withdrawals, users, promo codes, and support messages
- minimum withdrawal is $10
- deposit requests and withdrawal requests are shared across users on the same deployed server
- built frontend included in `dist/`

## Admin login
- Email: yousefch1978@gmail.com
- Password: Apple@2020

## Run locally
```bash
npm install
npm run build
npm start
```
Then open `http://localhost:3000`.

## Important
This project uses `server/data/db.json` as its shared database. Deploy it on a host that runs a persistent Node server and preserves that file.

## Main folders
- `src/` frontend React app
- `server/` Express API and JSON database
- `dist/` production frontend build

## Next upgrades you may still want later
- move JSON database to Supabase or PostgreSQL
- add real email delivery
- add image upload storage for deposit proofs
- add websocket real-time instead of polling
