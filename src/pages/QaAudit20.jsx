import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Approved changes + report-only register — 2026-11-28. No secrets. */
const ITEMS = [
  {
    id: 1, title: 'Session start — rules + live verify', status: 'PASS',
    evidence: 'HANDOFF padha, 11 NON-NEGOTIABLE RULES dohraye. Khud verify: health `{"status":"ok","queue_depth":0,"checks":{"db":true,"cache":true,"queue":true,"imap":true}}`; df 98G/21G used/72G avail; nginx/mysql/redis/php-fpm + fake-imap/queue/smtp active; `sync_enabled=1` sirf 803/804, koi cap override nahi.',
    next: '—',
  },
  {
    id: 2, title: 'APPROVED 1 — binlog retention 30→7 d', status: 'PASS',
    evidence: 'Har change se pehle DB dump (9.6M) + `.bak`. Ek hi source: `mysqld.cnf:75 binlog_expire_logs_seconds=604800` (SET PERSIST nahi; runtime `SET GLOBAL` sirf immediate effect). Doosra source nahi mila. `PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 7 DAY)` — **rm nahi**. BEFORE: **51 files / 5.2 G**, oldest 2026-11-25 18:55; AFTER: **51 files / 5.2 G** — **0 purge** kyunki sab binlog 7 din se nayein hain (25–28 Nov). PITR: full dump + uske baad ke binlogs + `mysqlbinlog`; 7 d se window 30→7 d. Health OK.',
    next: 'Binlog age 7 d se upar hone par apne aap expire honge; size tab ghatta hai.',
  },
  {
    id: 3, title: 'APPROVED 2 — slow-log logrotate + long_query_time=2', status: 'PASS',
    evidence: 'Dump + `.bak` (`mysql-server.bak.20261128-073710`, `mysqld.cnf.bak.20261128-073710`). `/etc/logrotate.d/mysql-server` me naya stanza: daily, rotate 7, compress, create **640 mysql adm**, postrotate `FLUSH SLOW LOGS` (mysqladmin me `flush-slow-logs` subcommand nahi — SQL statement exact hai). `long_query_time=2` config + runtime (`SHOW GLOBAL VARIABLES` → 2.000000). `logrotate -d` dry-run: "rotating pattern: /var/lib/mysql/nginx2-slow.log after 1 days (7 rotations)". Forced rotate exit 0: purana 1.7 G → **2.7 MB `.1.gz`**, nayi file **178 B, 640 mysql:adm**. Health OK.',
    next: '—',
  },
  {
    id: 4, title: 'APPROVED 3 — test config cache alag path', status: 'PASS',
    evidence: 'Dump + `run-tests.sh.bak.20261128-073817`. `run-tests.sh`: `export APP_CONFIG_CACHE=/tmp/opencode/test-config-cache.php`; rebuild `env -u APP_CONFIG_CACHE .../rebuild-config.sh` se (production cache path par). Production `bootstrap/cache/config.php` sha256 **BEFORE = AFTER = ae232c78027bbbf0dd5d4f7c76c66aa21e88cde18308851a3a2ed9144c7516ee**. Tests **201/201 PASS**, health OK. Test cache file create nahi hua (config:clear sirf delete karta hai) — expected.',
    next: '—',
  },
  {
    id: 5, title: 'NOT APPROVED — manifest.json nginx change', status: 'PASS',
    evidence: 'nginx `.json` allowlist change **nahi kiya**. Root cause Audit 19 me already documented (SnappyMail template + `portal:82 deny all`).',
    next: 'Aapki likhi ijazat tak nahi chhupayenge.',
  },
  {
    id: 6, title: 'Report (a) — sudo -l + NOPASSWD script', status: 'PASS',
    evidence: `sudo -l`: `(ALL : ALL) ALL` aur `(root) NOPASSWD: /home/masood/REACT-snappy/tools/harden-config-cache.sh` — sirf ek NOPASSWD script. Owner/mode: script **775 masood:masood**, dir `tools/` **775 masood:masood** → masood khud edit kar sakta hai (and `(ALL:ALL) ALL` se root bhi ban sakta hai). Script sirf `chgrp`/`chmod` karta hai (config.php, portal-audit.key, .env, .env.bak*) — data delete nahi.',
    next: 'Least-privilege: NOPASSWD rule ko root-owned, 755, masood-unwritable path par le jana (ijazat se).',
  },
  {
    id: 7, title: 'Report (b) — workers: start, idle, autostart, design', status: 'PASS',
    evidence: '`run-worker.sh`: free model rotation → `flock` lock → AUTH_READY check → pending queue scan → task ko running/ me move → `opencode run --agent --model --title` (600 s timeout) → done/failed + retry. `workers/status.sh`: pending 0, running 0 → **7 workers sab idle**; 6 ka last activity 25 Nov, be-implementer 06:55. Unit enabled, `WantedBy=default.target`, `Restart=always`, `Linger=yes` → reboot par auto-start. Rokne ka tareeqa: `systemctl --user disable opencode-worker@<naam>.service` (instance disable). Least-privilege DESIGN (implement nahi): alag `worker` user, sudo nahi, `.env` 640 masood:www-data se alag user read na kar sake, staging repo copy + production secrets se alag vault, `NoNewPrivileges=yes`, `ProtectHome=read-only`, system unit with `User=worker`.',
    next: 'Implement tab jab aap likhein.',
  },
  {
    id: 8, title: 'Report (c) — session history modes', status: 'PASS',
    evidence: '`~/.opencode` **775 masood:masood** (other r-x); `~/.local/share/opencode` **775 masood:masood**; `/tmp/opencode` **775 masood:masood**. DB files `opencode.db` **600 masood:masood** (dono jagah) → www-data group/other se **read nahi kar sakta** (ACL me group masood / other r-x sirf dir par). Content nahi padha.',
    next: '—',
  },
  {
    id: 9, title: 'Report (d) — binlog volume vs inserts + 800-mailbox projection', status: 'PASS (projection)',
    evidence: '24 h: **binlog 5193 MiB / 48 files** (~5.07 GiB, ≈211 MiB/h) vs `emails_24h=45` rows / **196.47 MB raw** aur `bodies_24h=1034` (one-time migration). Observed amplification ≈**26×** — migration/test-mail heavy, **steady-state nahi**. Real load par 800 mailboxes NOT TESTED. Projection (assumptions: non-test **43.2 KB raw/mail**, 100 mails/mailbox initial, 20 mails/mailbox/day): initial 80,000 mails ≈ **3.30 GiB logical** → binlog ~6.6 GiB @2× ya ~86 GiB @26×; daily 16,000 mails ≈ 0.66 GiB → ~1.3 GiB/day @2×, **7-d retention ≈ 9.2 GiB** @2×. 26× wala migration-heavy number steady-state projection ke liye appropriate nahi.',
    next: 'Gate 1 ke baad actual rate measure karke cap review.',
  },
  {
    id: 10, title: 'Report (e) — context + HANDOFF update', status: 'PASS',
    evidence: 'Context **~97%**. HANDOFF.md me approved/applied changes, .bak aur dump paths, NOT APPROVED manifest item, open items (Q1 804, browser result, Gate 1 list, reboot window, 45-mail delete approval) aur aaj ke (a)-(d) summary add kiye.',
    next: 'Compaction ke baad pehle HANDOFF padhein.',
  },
]

export default function QaAudit20() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 20' }]} />
      <PageHeader title="Q&A AUDIT 20" subtitle="3 approved changes applied + report-only a–e · har step ka saboot · koi secret nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
            <strong>10 PASS · Context ~97%.</strong> Teeno approved changes apply; manifest change nahi kiya (not approved). 201/201 tests, production config cache sha256 unchanged.
          </div>
          <div className="space-y-3">
            {ITEMS.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-surface/40 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone="success">{item.status}</Badge>
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
