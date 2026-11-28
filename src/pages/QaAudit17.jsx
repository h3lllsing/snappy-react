import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Report-only register — 2026-11-28. No config/DB/file/mailbox change. No secrets. */
const ITEMS = [
  {
    id: 1, title: 'sync_max_mb — df free se hisaab (config me nahi likha)', status: 'PASS',
    evidence: '`SyncBudget.php:43,59` formula: `floor(disk_free_space(base_path()) × 0.6 / planned_accounts / 1MiB)`. LIVE `disk_free_space(backend)` = **71.97 GiB** (`df -h /` → Avail 72G). Abhi: planned 800 → **55 MB**, planned 1000 → **44 MB**. LVM +100G ke baad actual projected 171.97 GiB → 800: **132 MB**, 1000: **105 MB**. Aapke bataye ~185 GiB par → 800: **142 MB**, 1000: **113 MB**. Note: 185 GiB ka matlab current ~85 GiB free hota — df se 71.97 GiB mila, isliye dono numbers diye. Config abhi bhi frozen `sync.max_mb=48` (derived_at 2026-11-28) — koi change nahi.',
    next: 'planned_accounts confirm + LVM ke baad hi owner authorization se config update.',
  },
  {
    id: 2, title: 'EnvironmentFile vs Laravel .env — value match?', status: 'FAIL',
    evidence: '`.env`: 76 lines, 58 assignments; **inline comments 0**, `export` lines 0, interpolation **2** (`MAIL_FROM_NAME`, `VITE_APP_NAME` — dono `${APP_NAME}`). Hash comparison (values print nahi, sha256 se): daemon `/proc/<pid>/environ` vs Dotenv parse — **56/58 match**, sirf wo 2 interpolation keys mismatch (systemd literal `${APP_NAME}` deta hai, Laravel expand karta hai). Config cache active hone ki wajah se pehle `env()` se comparison galat tha — sahi Dotenv parse se ye result hai. Design (implement nahi): daemon ke liye alag 600-mode `imap.env` sirf `IMAP_WORKERS`, `DB_*`, `REDIS_*`, `APP_KEY` ke saath; unit `EnvironmentFile=` usi file par; `${...}` aur quotes na rakhein; Laravel `.env` alag rahe — to dono ka source clear aur comparison 1:1 ho.',
    next: 'Agle window me alag imap.env design implement (ijazat se).',
  },
  {
    id: 3, title: 'Cleanup plan — UID EXPUNGE + \Deleted check', status: 'PASS (read-only)',
    evidence: 'Revision (sirf plan, execute nahi): plain `EXPUNGE` nahi — **UID EXPUNGE** (UIDPLUS support par) ya support na ho to **Trash me move** (EXPUNGE nahi). Read-only check: local mirror `is_deleted=1` → **0 rows** (803+804); upstream 803/804 ke sab folders (INBOX, Drafts, Sent, spam, Junk, Trash, Archive) me `SEARCH DELETED` → **sab 0**. 45 test UIDs ke ilawa koi \Deleted mail nahi mili. Koi delete/STORE/EXPUNGE nahi chalaya.',
    next: 'Aapki ijazat + browser check ke baad hi scoped UID EXPUNGE / Trash move.',
  },
  {
    id: 4, title: 'postgresql-18 — report only (hatana nahi)', status: 'PASS',
    evidence: '`dpkg -l | grep -i postgres`: libpq-dev 18.7, libpq5 18.7, php8.3-pgsql 8.3.37, **postgresql-18 18.7**, postgresql-18-jit, postgresql-client-18, postgresql-client-common 295, postgresql-common 295. `systemctl status postgresql.service` → **active (exited)**, enabled, Main PID code=exited status=0; `postgresql@18-main.service` inactive. `ss -ltnp | grep :5432` → **koi listener nahi**. apt history: 2026-11-18 ko `apt-get install -y sudo postgresql-18`. App DB MySQL hai — postgres unused. Sahi apt form: `sudo DEBIAN_FRONTEND=noninteractive apt-get -o Dpkg::Options::="--force-confold" -o Dpkg::Options::="--force-confdef" upgrade` (`--force-confold` seedha apt-get option nahi, Dpkg::Options se pass hota hai). Koi removal nahi kiya.',
    next: 'Reboot window me yahi apt form use karein; postgres hatana hai to alag approval.',
  },
  {
    id: 5, title: 'connlog test traffic tag + client_eof attribution', status: 'PASS (design only)',
    evidence: 'Current log: `client_eof` ab **29** (aapne 26 dekhe the), sab ke `commands=[]`; 28 `no_auth` + 1 `ok` (account 803, 21.7 s, 3.37 MB — meri diag script). Timestamps mere test runs (06:44, 06:52–54, 06:59, 07:07–08; `tools/run-tests.sh` har run 4 connections) se match karte hain → **29/29 mere scripts/tests**, real user browser se 0. Browser traffic `timeout`/`logout` records me commands ke saath dikhta hai. Design (implement nahi): connlog allowlist me `source` field (default `prod`), test harness loopback **port 1144** par chalao jise daemon `source=test` stamp kare; report `WHERE source=prod` se real failures alag ginay. Koi code change nahi kiya.',
    next: 'Test-port + source tag agle window me (ijazat se).',
  },
  {
    id: 6, title: 'Context % + HANDOFF update', status: 'PASS',
    evidence: 'Context ab **~90%**. HANDOFF.md me context notice ~88% → ~90% update kiya aur is report ka short summary add kiya (formula numbers, env mismatch 2 keys, cleanup revision, postgres unused, connlog attribution). Baaki pending wahi: Gate 1 mailbox list, browser result, test-mail delete approval, reboot window, Q1 804 transient open (non-blocker).',
    next: 'Compaction ke baad pehle HANDOFF.md padhein.',
  },
]

export default function QaAudit17() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 17' }]} />
      <PageHeader title="Q&A AUDIT 17" subtitle="Aapke Audit 14 ke sawaal · report only · koi config/DB/file/mailbox change nahi · koi secret nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <strong>5 PASS · 1 FAIL (Q2 — EnvironmentFile vs .env: 2 interpolation keys mismatch).</strong> Q6 me pichhle audit ka fail repeat nahi — aapke sawaal 1–6 ke jawab hain.
          </div>
          <div className="space-y-3">
            {ITEMS.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-surface/40 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone={item.status.startsWith('PASS') ? 'success' : 'warning'}>{item.status}</Badge>
                  <span className="text-sm font-semibold">{item.id}. {item.title}</span>
                </div>
                <div className="whitespace-pre-wrap font-mono text-xs text-muted">Saboot: {item.evidence}</div>
                <div className="mt-1 text-xs">Agla qadam: {item.next}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
