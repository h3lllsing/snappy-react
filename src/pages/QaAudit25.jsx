import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Applied fix + report-only register — 2026-11-28. No secret values. */
const ITEMS = [
  {
    id: 1, title: 'Session start + context', status: 'PASS',
    evidence: 'HANDOFF padha, 11 NON-NEGOTIABLE RULES dohraye. Khud verify: health ok (db/cache/queue/imap true, queue 0); df 98G/20G used/74G avail; nginx/mysql/redis/php8.3-fpm + fake-imap/queue/smtp active; sync_enabled=1 sirf 803/804, koi cap override nahi. CONTEXT >=98% — naya session kholein.',
    next: 'Naye session me pehle docs/HANDOFF.md padhein.',
  },
  {
    id: 2, title: 'APPROVED 1 — message-list fix applied', status: 'PASS',
    evidence: 'Design (pehle bataya): sirf `imap-server/ImapProtocol.php` — `structureOnlyFetch` se RFC822.SIZE/ENVELOPE exclusions hataaye (.metadata columns se serve), phir verification me 2 aur gz-open raaste mile: (i) uid 1181 ka body_structure NULL → parser fallback → 11 MB gz, (ii) `stripos($attributes,"RFC822")` RFC822.SIZE ko bhi full RFC822 fetch samajh kar raw load karta tha — dono band kiye. .bak: `ImapProtocol.php.bak.20261128-082420`, `.bak.20261128-083528`, `.bak.20261128-084605`. php -l + pint OK, daemon restart.',
    next: 'Browser test aap karenge.',
  },
  {
    id: 3, title: 'Verify (a)-(d)', status: 'PASS',
    evidence: '(a) 20-UID full-attrs page (UID 1162–1181, 9/12/11 MiB wale bhi): **1.19 s → 49.1 ms**; sirf 1171,1172: 52.3 ms; 9 chhote UIDs: 52.2 ms. (b) RFC822.SIZE 20 values: before_count=20, after_count=20, **diff_count=0 → match YES** (pehla "no" list/tuple comparison bug tha). (c) tests **206/206** (201 purane + 5 naye), assertions 1449. (d) 1032/1032 BODY[] sha256 integrity, **0 failures**, 102.8 s. Health ok.',
    next: '(e) browser test aapka baaki: 20-UID page smooth khulti hai ya nahi.',
  },
  {
    id: 4, title: 'APPROVED 2 — cap known limitation', status: 'PASS',
    evidence: '`docs/HANDOFF.md` me clear section: `MAX_FETCH_MESSAGES=1000` → `FETCH 1:*`/`*` returns **oldest 1000 UIDs** (`ORDER BY uid ASC` + array_slice); SnappyMail explicit UID-range pagination se unaffected. **Code me koi change nahi** — loopback-only limitation ke torus par documented.',
    next: '—',
  },
  {
    id: 5, title: 'REPORT (a) — purane psql roles + auth.log', status: 'PASS',
    evidence: 'Role names (sirf naam): **fusionpbx**, **freeswitch** (18–19 Nov CREATE ROLE / ALTER USER / GRANT). Kaam: dono DBs create + privileges FusionPBX/FreeSWITCH ke liye; 19 Nov ko read queries fusionpbx DB par (v_apps, pg_tables, v_menus, v_modules). Roles ab bhi data directory me maujood: PG18 `global` files **1260/1262** me dono names (cluster 18/main 5432 **down**, live query nahi kiya). auth.log: mode/owner **640 syslog:adm**, size ~748 KB; logrotate `/etc/logrotate.d/rsyslog`: weekly, rotate 4, compress + delaycompress, last rotation status **2026-11-17** → agla weekly rotation. Safe scrub plan (implement nahi): direct edit nahi — `logrotate -f /etc/logrotate.d/rsyslog` (ya rotate 4 ke saath weekly), purane compressed copies offbox retention se hatayein; purane DB role passwords agar abhi valid hain to rotation alag task. Koi password output me nahi.',
    next: 'Aapki ijazat se logrotate/rotation execute; abhi nahi.',
  },
  {
    id: 6, title: 'REPORT (b) — worker least-privilege + pilot impact', status: 'PASS (design)',
    evidence: '7 `opencode-worker@*` running (audit/implement agents), alag se **15 `alphaspace-*` mail units** (fake-imap, idle@0..5, queue + queue@1..7, smtp-relay, scheduler) — matlab opencode workers band karne se **mail flow/sync nahi rukta**, sirf audit/implementation tasks rukte hain. .env mode 640 masood:www-data → workers (user masood) padh sakte hain; unit `NoNewPrivileges=yes`, `ProtectHome=no`, `PrivateTmp=yes`, `Linger=yes` → reboot par auto-start. Options: (1) workers disable → zero audit tasks, mail pilot chalta hai; (2) .env restrict (alag low-priv credential file, workers ko sirf queue paths) → tasks DB/Redis access ke bina fail; (3) alag `worker` user, sudo nahi, staging repo, production secrets se alag vault, `ProtectHome=read-only` → best least-privilege par setup cost. Pilot 5–10 IT mailboxes ke liye load chhota hai → option (1) ya (3) safe; abhi koi change nahi.',
    next: 'Pilot window me aap decide karein; implement tab jab likhein.',
  },
  {
    id: 7, title: 'REPORT (c) — GO-READINESS TABLE (no GO verdict)', status: 'PASS',
    evidence: 'See table below. Sirf status + command output; "Production GO" nahi likha gaya.',
    next: 'FAIL/NOT TESTED owner review tak open.',
  },
  {
    id: 8, title: 'REPORT (d) — HANDOFF update', status: 'PASS',
    evidence: 'HANDOFF.md me Audit 24-25 summary, approved/applied (.bak paths, 206 tests, 49 ms, 1032/1032), known limitation section, open items (audit chain 3 broken, sudoers line, manifest, browser uid 14/1171/1172 + sha256, Gate 1, reboot window, 45-mail delete, Q7 alerts, MFA/LAN admin/backup key) aur old psql roles/auth.log plan add kiya. Context >=98%.',
    next: 'Compaction ke baad pehle HANDOFF padhein.',
  },
]

const GATE = [
  ['Q1 auth / admin middleware', 'PASS', 'route:list me api/admin/* (activities, imap-status, failed-jobs); admin_login True'],
  ['Q1b MFA enroll', 'NOT TESTED', 'owner enrollment pending'],
  ['Q2 Redis auth + AOF', 'PASS', 'redis_auth_set=yes; INFO persistence aof_enabled:1'],
  ['Q3 SMTP relay / SSO', 'PASS', 'smtp:relay-check active 127.0.0.1:2525; SSO 803/804 200/200/302'],
  ['Q4 backup + restore drill', 'PASS', 'backup_20261128-042040.ok; drill 1032/1032 hash OK (Audit 11)'],
  ['Q4b backup key copy', 'NOT TESTED', 'owner pending'],
  ['Q5 audit hash chain', 'FAIL', 'audit:verify-chain → OK 26, LEGACY 0, BROKEN 3 (ids 81,82,83)'],
  ['Q6 secrets rotation', 'PASS', 'env-20261127-215742.bak; APP_KEY rotation + pre-rotation restart verified'],
  ['Q7 alerts real delivery', 'FAIL', 'alerts:watch email=degraded telegram=degraded; alert_email_set=no, telegram_token_set=no'],
  ['Q8 SSO stale-daemon root cause', 'PASS', '200/200/302; canary_failed_5m=0'],
  ['Q9 sync recent-first + cap', 'PASS', 'sync_max_mb=48, derived_at 2026-11-28; recent pass ungated'],
  ['Q10 bodies migration/backfill', 'PASS', 'email_bodies=1034 (1032 + 2 new); BODY[] integrity 1032/1032, 0 failures'],
  ['Q11 numbers/backup heal', 'PASS', 'non-test 4.4x; bodies:heal 1/1 verified; TEST-MAILS 45 rows'],
  ['Q12 large-literal fix', 'PASS', '12.7 MiB BODY[] 0.131 s; 9/12 MiB partial 184/196 ms'],
  ['Q13 busy metric + limits', 'PASS', 'imap_busy=0 established=0 workers=4; FPM 128M/30s, nginx 300-360s'],
  ['Q14 env single source', 'PASS', '.env:76 IMAP_WORKERS=4; unit EnvironmentFile; workers=4'],
  ['Q15 browser bug diagnose', 'PASS', 'BODY.PEEK[1] 60 s root cause documented'],
  ['Q16 partial stream + deadline', 'PASS', '184 ms; 18 s stalled-client close; 1032/1032'],
  ['Q17 env-vs-.env interpolation', 'PASS (cosmetic)', '56/58 hash match; 2 ${VAR} keys accepted'],
  ['Q18 reports/network/LVM', 'PASS', 'netplan/LVM/reboot plan docs only, no apply'],
  ['Q19 manifest.json 404', 'FAIL', 'static .json URL 404 (nginx deny rule); NOT APPROVED to fix'],
  ['Q20 binlog/logrotate/config-cache', 'PASS', '7 d retention; slowlog rotate verified; config 640 masood:www-data, 2750 dir'],
  ['Q21 history lock', 'PASS', '3 dirs 700; loose files 0; workers 192/0'],
  ['Q22 browser mail open 1181', 'PASS', 'Message 200/993 B, download 200/8.39 MB, 0 errors'],
  ['Q23 sudoers NOPASSWD removal', 'FAIL', 'line still in /etc/sudoers.d/opencode-config-cache; sudo -n helper runs'],
  ['Q25 message-list speed', 'PASS', '20-UID full-attrs 1.19 s -> 49 ms; 206 tests; 1032/1032'],
]

const OWNER = [
  'Q7 alert delivery values (ALERT_EMAIL_TO, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)',
  'browser uid 14/1171/1172 + downloaded-file sha256 match',
  'LAN admin check / MFA enroll / backup key copy',
  'sudoers NOPASSWD line (second removal + sudo -n re-test)',
  'Ethernet move + Wi-Fi off + LVM +100G + apt upgrade + reboot window',
  'Gate 1 mailbox list (no mailbox/sync added yet)',
  '45 test-mail scoped delete approval',
  'manifest.json nginx allowlist fix (cosmetic, not approved)',
  'audit chain BROKEN ids 81,82,83 decision',
]

export default function QaAudit25() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 25' }]} />
      <PageHeader title="Q&A AUDIT 25" subtitle="Message-list fix applied · report a–d · GO-READINESS table (no verdict) · koi secret nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <strong>8 PASS · Context >=98% — naya session kholein.</strong> 20-UID page 1.19 s → 49 ms, 206/206 tests, 1032/1032 integrity. FAIL: audit chain (3), alerts degraded, manifest 404, sudoers line.
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
      <Card>
        <CardBody>
          <h2 className="mb-2 text-sm font-semibold">GO-READINESS (status only — no GO verdict)</h2>
          <div className="space-y-1 font-mono text-[11px]">
            {GATE.map(([name, status, ev]) => (
              <div key={name} className="flex flex-wrap gap-x-2 rounded border border-border px-2 py-1">
                <span className="min-w-[210px] font-semibold">{name}</span>
                <Badge tone={status.startsWith('PASS') ? 'success' : status === 'FAIL' ? 'danger' : 'warning'}>{status}</Badge>
                <span className="text-muted">{ev}</span>
              </div>
            ))}
          </div>
          <h3 className="mb-1 mt-3 text-sm font-semibold">Pending owner items</h3>
          <ul className="list-inside list-disc font-mono text-[11px] text-muted">
            {OWNER.map((o) => <li key={o}>{o}</li>)}
          </ul>
        </CardBody>
      </Card>
    </div>
  )
}
