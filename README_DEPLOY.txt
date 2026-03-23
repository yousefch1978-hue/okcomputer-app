OKComputer full-stack deploy package

What changed:
- shared backend added (server/index.js)
- deposits/withdrawals/messages/promo codes are now shared for all users
- refresh keeps the current page using hash routing
- login persists using a real session token
- admin can approve/reject deposits and withdrawals
- admin can see and reply to support messages
- layout width is more desktop friendly

Admin login:
Email: yousefch1978@gmail.com
Password: Apple@2020

Run locally:
1. npm install
2. npm run build
3. npm start
4. open http://localhost:3000

Deploy:
- Deploy as a Node app
- Make sure the server can write to: server/data/db.json
- Build command: npm install && npm run build
- Start command: npm start

Notes:
- Data is stored in server/data/db.json
- If your host has an ephemeral filesystem, use a real database later
