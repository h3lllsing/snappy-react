# snappy-react

React frontend for the Alphaspace/SnappyMail operations portal.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

Node 22+ recommended. Demo login accepts any email/password.

## Local live demo (SQLite)

```bash
# backend
cd /home/masood/REACT-snappy/backend
php artisan serve --host=127.0.0.1 --port=8000

# frontend (Vite proxies /api to :8000)
cd /home/masood/snappy-react
cp .env.local.example .env.local 2>/dev/null || true
npm run dev -- --host 0.0.0.0
```

Open http://localhost:5173 (or http://10.20.30.250:5173). Demo login:
`bilal@alphatach.com` / `ChangeMe123!` (all seeded users use the same password).
