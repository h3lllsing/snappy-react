import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Diagnose + plans + report-only register — 2026-11-28. Nothing applied. No secrets. */
const ITEMS = [
  {
    id: 1, title: 'Session start — rules + khud state verify', status: 'PASS',
    evidence: '`docs/HANDOFF.md` padha, 11 NON-NEGOTIABLE RULES dohraye. Doc par bharosa nahi kiya: LIVE `health` → `{"status":"ok","queue_depth":0,"checks":{"db":true,"cache":true,"queue":true,"imap":true}}`; `df /` → 98G/21G used/72G avail; nginx, mysql, redis-server, php8.3-fpm, fail2ban + fake-imap, queue, smtp-relay **active**; `sync_enabled=1` sirf 803/804, koi per-account cap override nahi.',
    next: '—',
  },
  {
    id: 2, title: 'Browser bug: manifest.json 404 — DIAGNOSE ONLY', status: 'PASS',
    evidence: 'Aapka andaza tha ki React `dist/index.html` me `<link rel="manifest">` hai aur file nahi — **galat**: FE `index.html` aur `dist/index.html` me koi manifest link nahi (grep 0). Asli link SnappyMail template se: `public/webmail/snappymail/v/2.38.2/app/templates/Index.html:13` → `{{BaseAppManifestLink}}`, `Service.php:180` se `Utils::WebStaticPath("manifest.json")`. Rendered HTML: `<link rel="manifest" href="/webmail/snappymail/v/2.38.2/static/manifest.json">`. File disk par **maujood** (537 B) aur `favicon.svg` 200 deta hai, par manifest URL **404** — wajah nginx `/etc/nginx/sites-available/portal:82`: `location ~ ^/webmail/.*\.(?:json|log|ini|pem|key|bak)$ { deny all; return 404; }` — Gate 0 security rule ne static manifest.json bhi block kar diya. Browser console ka 404 yahi hai. `/manifest.json` alag se 200 text/html (SPA fallback) deta hai — wo issue nahi. **Koi fix nahi kiya** (cosmetic, likhi ijazat chahiye).',
    next: 'Aap likhkar ijazat doon to exact static path ko allowlist karna (baqi .json blocked rahein).',
  },
  {
    id: 3, title: 'Binlog 30→7 din — pehle report (APPLY NAHI)', status: 'PASS (plan)',
    evidence: '`mysqld.cnf:74-75` me dono lines commented → default `binlog_expire_logs_seconds=2592000` (30 d). LIVE: **51 binlogs, 5.2 GB**, oldest 2026-11-25 18:55, newest 2026-11-28 07:30; `SHOW BINARY LOGS` 51 rows; `log_bin=ON`, format **ROW**, `gtid_mode=OFF`; `mysqlbinlog` available. Plan (ijazat ke baad): my.cnf me `binlog_expire_logs_seconds=604800` persist + `SET GLOBAL ...`; purane logs sirf `PURGE BINARY LOGS BEFORE ...` (rm nahi), pehle DB dump + `.bak`. PITR ke liye chahiye: ek known-good full dump (latest `db_20261128-042040.sql.gz`) + us dump ke baad ke saare binlogs + `mysqlbinlog --stop-datetime` replay; 7 d retention se PITR window 30→7 din kam hoga (daily backups se 7 restore points bachein).',
    next: 'Aapki likhi ijazat se hi apply; tab pehle dump + .bak.',
  },
  {
    id: 4, title: 'nginx2-slow.log logrotate + long_query_time — plan only', status: 'PASS (plan)',
    evidence: '`mysqld.cnf` slow_log ON, file `/var/lib/mysql/nginx2-slow.log`, size **1.7 GB**, `long_query_time=1`. `/etc/logrotate.d/mysql-server` sirf `/var/log/mysql.log /var/log/mysql/*log` (daily, rotate 7, compress) cover karta hai — `/var/lib/mysql/nginx2-slow.log` **uncovered**, isliye badhta gaya. Plan: us path ko logrotate me add + `postrotate` me `mysqladmin flush-slow-logs` (FLUSH SLOW LOGS), rotate 7/compress; `long_query_time` proposal **2 s** (pehle 3 s option bhi diya — 2 se chhoti queries kam, slow-query signal clear). **Koi apply nahi kiya.**',
    next: 'Likhi ijazat se hi logrotate + my.cnf change (pehle dump + .bak).',
  },
  {
    id: 5, title: 'Report (a) — opencode-worker@* services', status: 'PASS',
    evidence: '7 instances running: `be-audit-correctness`, `be-audit-recovery`, `be-audit-reporting`, `be-implementer`, `fe-be-contract`, `nginx-deploy-architect`, `security-auditor`. Template `~/.config/systemd/user/opencode-worker@.service`: `indirect enabled`, `WantedBy=default.target`, `Restart=always`, `After/Wants=network-online.target`, `NoNewPrivileges=yes`, `ProtectHome=no`, `PrivateTmp=yes`, ExecStart `workers/run-worker.sh %i`. `Linger=yes` → **reboot ke baad khud shuru honge**. Access: user `masood` (groups sudo, adm), `.env` mode **640 masood:www-data** → padh sakte hain; sudo group + password available. Koi secret output nahi.',
    next: 'agar reboot ke baad inhe band rakhna ho to alag approval chahiye.',
  },
  {
    id: 6, title: 'Report (b) — AI session history (jagah + size only)', status: 'PASS',
    evidence: '`~/.opencode` **326 MB** (3654 files); `~/.local/share/opencode` **227 MB** (1225 files, `opencode.db` ~193 MiB); `/tmp/opencode` **205 MB** (392 files, `db-backup/opencode.db` ~123 MiB). Content nahi padha. **Secrets risk:** session transcripts me commands/outputs aa sakte hain — isliye history files ko report/chat me copy nahi karna, sha256/flag comparison hi karna (rule 1).',
    next: 'Koi cleanup/export nahi — owner approval tak.',
  },
  {
    id: 7, title: 'Report (c) — config:clear window + safer design', status: 'PASS',
    evidence: '`tools/run-tests.sh`: `config:clear` → test → `rebuild-config.sh` (`config:cache` + `sudo -n harden-config-cache.sh`). Live config cache `bootstrap/cache/config.php` mode 640, last rebuilt 07:26. Window ≈ test suite time (last run 201 tests / **13.1 s**) + 3 chhote commands (sub-second) → ~14–16 s estimate; exact sub-second timing **NOT TESTED** (report-only me script chalana hota jo cache badalta). Is window me app uncached `.env` padhta hai — `${VAR}` wale 2 keys (MAIL_FROM_NAME, VITE_APP_NAME) alag value de sakte hain; concurrent config writer ya FPM request se race possible. **Safer design:** test runner me `APP_CONFIG_CACHE=/tmp/opencode/test-config-cache.php` set karo — `config:clear/config:cache` sirf test cache ko touch karein, production `bootstrap/cache/config.php` untouched rahe (Laravel 13: `Application::getCachedConfigPath()` → `normalizeCachePath("APP_CONFIG_CACHE", ...)`).',
    next: 'Safer design implement tab jab owner likhkar bole.',
  },
]

export default function QaAudit19() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 19' }]} />
      <PageHeader title="Q&A AUDIT 19" subtitle="Fresh state · manifest 404 diagnose · binlog/slow-log plans · report-only (a)(b)(c) · koi secret nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <strong>7 PASS · Context ~97%.</strong> Koi change nahi kiya — manifest fix cosmetic (ijazat chahiye), binlog/slow-log plans sirf propose.
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
