import { useMemo, useState } from 'react'
import { Badge, Button, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/**
 * CTO-level Q&A evidence register — 2026-11-27.
 * Every status is backed by a command output or an exact file:line reference.
 * No mock data, no generic statements.
 */
const ITEMS = [
  {
    section: 'A — CONFIG & SECRETS', q: '1. .env mein APP_ENV, APP_DEBUG, LOG_LEVEL ki exact values?',
    status: 'PASS',
    evidence: 'backend/.env → APP_ENV=production, APP_DEBUG=false, LOG_LEVEL=warning',
    next: 'Koi nahi.',
  },
  {
    section: 'A — CONFIG & SECRETS', q: '2. php artisan config:show app.debug output?',
    status: 'PASS',
    evidence: '$ php artisan config:show app.debug →  app.debug .. false',
    next: 'Koi nahi.',
  },
  {
    section: 'A — CONFIG & SECRETS', q: '3. Git history me .env / APP_KEY / DB-SMTP-IMAP ya sudo password commit hua?',
    status: 'NOT TESTED',
    evidence: 'backend git repo nahi hai: `git rev-parse --is-inside-work-tree` → "fatal: not a git repository". FE repo tracked files: .env.example, .env.local.example (placeholders) — `git ls-files | grep -iE ".env|secret|.key$"`.',
    next: 'Agar backend ko git me lana ho to pehle history scan `git log -p -S` karo; verified placeholder-only FE history.',
  },
  {
    section: 'A — CONFIG & SECRETS', q: '4. APP_KEY rotation + credentials re-encrypt procedure documented? Dry-run?',
    status: 'NOT TESTED',
    evidence: 'Docs me procedure hai: docs/SIGNOFF.md:138 (coordinated re-encryption), docs/STAGE2-SCALE-PLAN.md:73 (S2-15 APP_PREVIOUS_KEYS), docs/SECURITY-STANDARDS.md:205 (versioned key scheme). Dry-run nahi kiya — rotation live data ko affect karti hai.',
    next: 'Owner authorization ke baad staging me APP_PREVIOUS_KEYS ke saath dry-run; live dry-run nahi chalayunga.',
  },
  {
    section: 'A — CONFIG & SECRETS', q: '5. Secrets register kyun pending? Kaun si secrets, kahan, kab rotate?',
    status: 'FAIL',
    evidence: 'docs/SECURITY-EVIDENCE/secrets-register.md:5-15 — 11 entries (APP_KEY, DB_PASSWORD, IMAP_DB_PASSWORD, MAIL_PASSWORD, NOTIFICATION_API_TOKEN, REVERB_APP_KEY, REVERB_APP_SECRET, Reverb TLS cert/key, PFX password, FTP credentials, seed passwords). Sab COMPROMISED/PENDING; stored in .env / portal-audit.key / legacy files. Last rotation: PENDING.',
    next: 'S2-15 runbook ke hisaab se rotation window aur compromised list owner se lo; register update karo.',
  },
  {
    section: 'A — CONFIG & SECRETS', q: '6. Sudo password rotation ka date aur owner?',
    status: 'FAIL',
    evidence: 'Password abhi bhi Itrs*1234 hai (is audit me sudo -S se kaam chalaya). Rotation nahi hui. Owner: user (aapne kaha final ke baad karna hai). Date: TBD.',
    next: 'Production GO ke turant baad aap rotate karein; naye password ko docs me na likhein.',
  },
  {
    section: 'B — MAIL FLOW CORRECTNESS', q: '7. Email kaun send karta hai: SnappyMail ya PushSentEmailsToServerJob? 2 domains par exactly 1 copy ka saboot?',
    status: 'NOT TESTED',
    evidence: 'Code: imap-server APPEND sets sent_via_webmail; PushSentEmailsToServerJob.php:126-140 skips SMTP for those rows (double-delivery prevention). SnappyMail SMTP config: alphatach.com.json:49 verify_peer=true. Doosre domain par real recipient inbox verify nahi kiya (recipient credentials available nahi).',
    next: '2 alag recipients par controlled test mail bhejkar Message-ID se exactly-one-copy verify karo.',
  },
  {
    section: 'B — MAIL FLOW CORRECTNESS', q: '8. Portal me delete/read/move/spam par real server me kya hota hai?',
    status: 'FAIL',
    evidence: 'grep -rn "flags.*upstream|SETFLAGS.*real|storeFlags.*imap" app imap-server → koi output nahi. Fake IMAP FLAGS/STORE sirf local mirror me likhta hai; real server par push code nahi hai. Bahar (phone/Outlook) ki state 5-min sync se local mirror me aati hai.',
    next: 'Reverse flag sync (STORE → upstream IMAP) implement karo, warna 2-way state diverge karegi.',
  },
  {
    section: 'B — MAIL FLOW CORRECTNESS', q: '9. Drafts/Trash/Spam/custom folders sync? SPECIAL-USE ya hardcoded?',
    status: 'FAIL',
    evidence: 'SyncAccountEmailsJob.php:112-125 → canonical = [INBOX, INBOX.Sent, INBOX.Drafts, INBOX.Spam, INBOX.Trash, INBOX.Archive] (hardcoded). SPECIAL-USE detection ka code nahi mila. 3 alag servers par test nahi hua.',
    next: 'SPECIAL-USE/XLIST based folder discovery + custom folder sync; 3 providers par verify.',
  },
  {
    section: 'B — MAIL FLOW CORRECTNESS', q: '10. UIDVALIDITY badalne par kya hota hai?',
    status: 'NOT TESTED',
    evidence: 'Code path hai: SyncAccountEmailsJob.php:88,227-258 (uid_validity compare, mirror reset). LIVE simulation nahi kiya — real mailbox ki UIDVALIDITY badalna destructive hai.',
    next: 'Staging account par controlled UIDVALIDITY change ke saath test karo.',
  },
  {
    section: 'C — FAILURE HANDLING', q: '11. Internet 15 min band → sab accounts paused? Circuit breaker?',
    status: 'NOT TESTED',
    evidence: '15-min outage simulate nahi kiya. Code: EmailStatService.php:18-29 exponential cooldown + 3 failures par auto-pause; ImapIdleService.php:75-88 30-min skip. Real incident 03:37-04:16 UTC me transient DNS fail par dono accounts auto-pause hue the (issues 859/860), baad me restore.',
    next: 'Maintenance window me controlled upstream block ke saath 15-min drill karo.',
  },
  {
    section: 'C — FAILURE HANDLING', q: '12. Paused account auto-retry? Admin ko alert kaise?',
    status: 'FAIL',
    evidence: 'Auto-retry: ReconcileStuck.php:52-101 (cooldown ke baad resume) ✅. Alert: sirf ops_events row; .env MAIL_MAILER=log → email bahar nahi jati. AlertService.php:21-58 dedupe/ops_events, :recordDeliveryFailure.',
    next: 'Paused-account ke liye real email/SMS alert channel configure karo (MAIL_MAILER=log hata kar).',
  },
  {
    section: 'C — FAILURE HANDLING', q: '13. Redis/MySQL restart par queue, IDLE, fake IMAP khud recover?',
    status: 'PASS',
    evidence: 'Controlled restarts 01:16 UTC (MySQL) aur 01:17 UTC (Redis): uske baad `curl /api/health` → 200, 8 queue workers + 6 IDLE shards + fake-imap active, AOF last write ok, buffer pool 4294967296. Abhi bhi yahi state hai.',
    next: 'Koi nahi; quarterly drill continue rakho.',
  },
  {
    section: 'C — FAILURE HANDLING', q: '14. Laptop reboot par sab services auto-start? Restart order?',
    status: 'NOT TESTED',
    evidence: '`sudo reboot` nahi kiya (session terminate ho jata). Enabled evidence: nginx/mysql/redis/php8.3-fpm/fail2ban=enabled; alphaspace-fake-imap/queue/idle@0/backup.timer=enabled.',
    next: 'Aapke convenience time me ek controlled reboot test karo; uske baad health + sab units verify.',
  },
  {
    section: 'D — ACCESS CONTROL', q: '15. can_receive=1, can_send=0 user SnappyMail se mail bhej sakta hai?',
    status: 'FAIL',
    evidence: 'grep can_send in WebmailTokenController.php / imap-server/ImapProtocol.php → koi output nahi. can_send sirf portal SendController me check hota hai. SnappyMail real SMTP credentials se directly bhejta hai → pivot flag enforce nahi hota.',
    next: 'Fake IMAP APPEND/SMTP path me can_send gate ya SSO token me send-ability claim add karo.',
  },
  {
    section: 'D — ACCESS CONTROL', q: '16. Assignment hatane par session/iframe kitni der me invalid?',
    status: 'FAIL',
    evidence: 'portal-sso.php:108 → webmail_sessions expires_at = now()+8h. AssignmentController.php / AssignmentService.php me session deletion ka code nahi mila (grep webmail_sessions|session → koi output). Hatane par bhi ~8 ghante tak existing session chal sakta hai.',
    next: 'Assignment revoke par webmail_sessions delete + portal_ws cookie expire karo (immediate).',
  },
  {
    section: 'D — ACCESS CONTROL', q: '17. Unassigned mailbox ka webmail-token endpoint response?',
    status: 'PASS',
    evidence: 'Live test: temporary role=user (qatest2@local), POST /api/email-accounts/803/webmail-token → HTTP 403 {"message":""}. Temp user/token scoped delete kiya.',
    next: 'Koi nahi.',
  },
  {
    section: 'D — ACCESS CONTROL', q: '18. Fake IMAP auth — bina valid token ke koi local process parh sakta hai?',
    status: 'PASS',
    evidence: 'Wrong password test: imaplib.IMAP4("127.0.0.1",1143).login("i.T@alphatach.com","definitely-wrong") → [AUTHENTICATIONFAILED] Invalid credentials. Correct creds se LOGIN OK (803: 960, 804: 16).',
    next: 'Koi nahi (credential-holder ke liye expected access).',
  },
  {
    section: 'D — ACCESS CONTROL', q: '19. Super-admin/admin ke liye MFA/2FA?',
    status: 'FAIL',
    evidence: 'grep -rn "two.factor|2fa|Fortify" app routes composer.json → koi output nahi.',
    next: 'Fortify 2FA ya TOTP-based challenge admin/super-admin par implement karo (high priority).',
  },
  {
    section: 'D — ACCESS CONTROL', q: '20. Login brute-force protection saboot?',
    status: 'PASS',
    evidence: 'routes/api.php:33 → POST /login middleware throttle:5,1. fail2ban jails: nginx-404, nginx-dos, ssh, sshd (active).',
    next: 'Koi nahi; API-specific fail2ban jail future me add kar sakte ho.',
  },
  {
    section: 'E — SCALE & RESOURCES', q: '21. 6 IDLE shards: RSS, connections, reconnect rate?',
    status: 'PASS',
    evidence: 'RSS 64,788–68,332 KB per shard; socket fds 4–6 per shard (ps /proc/<pid>/status + /proc/<pid>/fd). Reconnect rate: NOT TESTED (measured window nahi).',
    next: 'Agar reconnect rate chahiye to 24h telemetry count nikalna padega.',
  },
  {
    section: 'E — SCALE & RESOURCES', q: '22. Fork parent + child ka matlab? Per-connection fork ya fixed workers?',
    status: 'PASS',
    evidence: 'imap-server/server.php:34 IMAP_WORKERS env, :222 pcntl_fork(), :269 supervisor respawn. Fixed workers (abhi 2) — per-connection fork nahi. Har child apna PDO banata hai (setDb pattern), shared socket kernel se distribute hota hai. Live: parent 1433780 + child 1433782, dono :1143 par.',
    next: 'Koi nahi; rollback unit backup: alphaspace-fake-imap.service.bak-prefork.',
  },
  {
    section: 'E — SCALE & RESOURCES', q: '23. Emails+attachments size aur 800 mailbox projection? Disk quota/80% alert?',
    status: 'FAIL',
    evidence: 'Live: emails payload ~51.3 MiB, attachments 2.3 MiB (197 files). 800 mailbox projection (linear): ~26.8 GB emails table, ~920 MB attachments (330 MB deduped) — 3 GiB buffer pool se 8.9×. Disk: 80 GiB free. 80% usage alert / quota nahi mila.',
    next: 'Disk monitoring + 80% alert add karo; scale se pehle retention/dedupe dry-run.',
  },
  {
    section: 'E — SCALE & RESOURCES', q: '24. mail:prune 3650 din; initial sync last N mahine tak limit?',
    status: 'FAIL',
    evidence: 'routes/console.php:30 → mail:prune --days=env(MAIL_PRUNE_DAYS,3650). UpstreamImapService.php → fetch limit 100 messages/folder; "last N months" option nahi mila.',
    next: 'SYNC_AFTER_DATE / max-months config add karo agar historical backfill limit chahiye.',
  },
  {
    section: 'E — SCALE & RESOURCES', q: '25. FE 2s poll: 100 concurrent users par PHP-FPM load?',
    status: 'NOT TESTED',
    evidence: '100-user load test nahi kiya. Theoretical: 100 × 30 req/min = 50 req/s; poll SQL ~0.35 ms (EXPLAIN ANALYZE), per-user throttle 120/min. Serve abhi 2 users par 200 OK.',
    next: '100-user load test karo ya polling 5–10 s / SSE par le jao (stage gate).',
  },
  {
    section: 'E — SCALE & RESOURCES', q: '26. Pilot plan: 30–50 mailboxes, provider diversity, 5–10 users, 7 din?',
    status: 'NOT TESTED',
    evidence: 'Pilot abhi shuru nahi hua (sirf 2 live accounts). Checklist + rollback niche hai.',
    next: 'Pilot checklist: (1) 30–50 real mailboxes, kam se kam 1/provider; (2) 5–10 users aur roles; (3) roze provider report + queue depth + health; (4) 7 din baad go/no-go. Rollback: sync_enabled=0 on pilot accounts, FE nav se pilot accounts hide, DB snapshot se restore (docs/STAGE2-SCALE-PLAN.md).',
  },
  {
    section: 'F — SECURITY HARDENING', q: '27. Attachments par malware scanning? ClamAV option aur RAM cost?',
    status: 'FAIL',
    evidence: 'command -v clamdscan → NOT_INSTALLED. ClamAV ~500 MB RAM + ~200 MB signatures; download-time scan latency ~100–500 ms/file.',
    next: 'Agar security policy chahiye: clamd + on-download scan (lazy/binary-safe) install karo; warna accepted risk par chhodo.',
  },
  {
    section: 'F — SECURITY HARDENING', q: '28. Iframe security: CSP, X-Frame-Options, cookie flags? SnappyMail admin blocked?',
    status: 'FAIL',
    evidence: 'PASS headers: CSP nonce-based (default-src self, frame-ancestors self), X-Frame-Options SAMEORIGIN, HSTS, COOP/CORP. Cookie: portal_ws Secure+HttpOnly+SameSite=Lax (portal-sso.php:113). FAIL: SnappyMail admin panel ko block karne wali explicit nginx rule nahi mili (grep admin.php → no output).',
    next: 'NGINX me /webmail/admin.php aur admin paths ko LAN/loopback ya auth ke peeche band karo.',
  },
  {
    section: 'F — SECURITY HARDENING', q: '29. Self-signed TLS: CA install guide aur renewal reminder?',
    status: 'FAIL',
    evidence: 'docs me CA-install guide nahi mila (grep "CA install|nginx.crt|certificate authority" docs → koi output). Cert: CN=alphatach.com, SAN includes 10.20.30.250, notAfter 2036-11-22; certbot/renewal timer nahi.',
    next: 'Client CA-install guide likho + calendar renewal owner/date set karo (2036 se pehle).',
  },
  {
    section: 'G — BACKUP & RECOVERY', q: '30. Off-site/offline encrypted copy plan?',
    status: 'FAIL',
    evidence: 'BACKUP_OFFHOST / BACKUP_GPG_RECIPIENT .env me unset; owner ne off-site explicitly excluded kiya (local mirror, authoritative server nahi).',
    next: 'Agar kabhizarurat ho: external disk/second machine par restic (AES-256) with DB+attachments+.env+domain JSONs, weekly cron, restore test monthly.',
  },
  {
    section: 'G — BACKUP & RECOVERY', q: '31. Restore drill: scratch DB, row counts, attachment hash, permissions?',
    status: 'PASS',
    evidence: 'Latest dump 20261127-000358 → scratch restore: tables=33, emails=989, accounts=2, attachments=209. Attachment sample sha256 archive=live=52153cf3...d029518 → HASH_MATCH=YES. Backup files mode 600 masood:masood. Scratch DB drop kiya.',
    next: 'Monthly drill continue.',
  },
  {
    section: 'H — TESTS & MONITORING', q: '32. 93 tests me se kaun real IMAP/SMTP, kaun mock?',
    status: 'PASS',
    evidence: 'Real external IMAP/SMTP test: NONE (grep imap_open/IMAP4_SSL/send in tests → sirf namespaced function override in ImapTelemetryTest.php:6). Mock/Queue::fake/Http::fake markers: AttachmentHybridTest(20), PushSentEmailsToServerJobTest(32), SignoffAcceptanceTest(14), ScaleAcceptanceTest(11), AdaptiveSyncTest(5), others 0–4. Sab 93 tests mock/fake par chalte hain.',
    next: 'Kam se kam 2 integration tests real staging IMAP/SMTP par add karo.',
  },
  {
    section: 'H — TESTS & MONITORING', q: '33. Alerting: shard down, queue high, disk >80%, paused accounts?',
    status: 'FAIL',
    evidence: 'AlertService.php:21-58 ops_events + alert_sent_at; MAIL_MAILER=log → email off-host nahi. Queue depth health me dikhta hai par alert nahi. Disk 80% alert nahi. Paused account ka ops_event hai par external notification nahi.',
    next: 'In-app + real email/SMS alerts add karo (shard down, queue>100, disk>80%, paused>N).',
  },
  {
    section: 'H — TESTS & MONITORING', q: '34. Pending list: owner aur deadline?',
    status: 'PASS',
    evidence: 'Owner/deadline table: (1) sudo rotation — user, GO ke turant baad; (2) secrets register — Security owner + user, 7 din; (3) MFA — backend owner, 7 din; (4) can_send/session invalidation — backend owner, 7 din; (5) flag/folder reverse sync — backend owner, pilot se pehle; (6) alerting + disk alert — ops, 7 din; (7) load test — ops, pilot week 1; (8) TLS guide — ops, 30 din; (9) ClamAV — user decision; (10) Redis replica — ops, scale gate par.',
    next: 'Owner aur deadline confirm karke tracker me mark karo.',
  },
]

const FILTERS = ['ALL', 'PASS', 'FAIL', 'NOT TESTED']

export default function QaAudit() {
  const [filter, setFilter] = useState('ALL')
  const counts = useMemo(() => ({
    ALL: ITEMS.length,
    PASS: ITEMS.filter((i) => i.status === 'PASS').length,
    FAIL: ITEMS.filter((i) => i.status === 'FAIL').length,
    'NOT TESTED': ITEMS.filter((i) => i.status === 'NOT TESTED').length,
  }), [])
  const shown = filter === 'ALL' ? ITEMS : ITEMS.filter((i) => i.status === filter)

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit' }]} />
      <PageHeader
        title="CTO Q&A — Evidence Register"
        subtitle="34 sawal · har jawab PASS / FAIL / NOT TESTED · command output ya file:line saboot ke saath · 2026-11-27"
      />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <strong>Verdict: GO with conditions.</strong> Sections A, B, C, D me FAIL items hain
            (Q5, Q6, Q8, Q9, Q12, Q15, Q16, Q19) — isliye "Production GO" nahi likha gaya.
            Baaki sections ke FAIL/NOT TESTED items owner/deadline ke saath niche table me hain.
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Button key={f} size="sm" variant={filter === f ? 'primary' : 'secondary'} onClick={() => setFilter(f)}>
                {f} ({counts[f]})
              </Button>
            ))}
          </div>
          <div className="space-y-3">
            {shown.map((item) => (
              <div key={item.q} className="rounded-lg border border-border bg-surface/40 p-3">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge tone={item.status === 'PASS' ? 'success' : item.status === 'FAIL' ? 'danger' : 'warning'}>
                    {item.status}
                  </Badge>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{item.section}</span>
                </div>
                <div className="text-sm font-semibold">{item.q}</div>
                <div className="mt-1 whitespace-pre-wrap font-mono text-xs text-muted">Saboot: {item.evidence}</div>
                <div className="mt-1 text-xs">Agla qadam: {item.next}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
