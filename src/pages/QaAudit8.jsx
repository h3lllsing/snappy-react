import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Diagnostic + design register — 2026-11-28. No fix applied, no secrets. */
const ITEMS = [
  {
    id: 'A', title: 'SnappyMail auto-login diagnose — root cause: stale fake-IMAP daemon (old APP_KEY)', status: 'PASS',
    evidence: 'REPRODUCE: POST /api/email-accounts/803/webmail-token → **HTTP 200** token (can_send=true, 300s). POST /webmail/portal-sso.php?t=... → **HTTP 200** auto-submit form. POST /webmail/?sso with hash → **HTTP 302** /webmail/. webmail_sessions row ban rahi hai (newest id 194, can_send=1, expires +8h). MFA/EnsureMfaVerified ne nahi roka (temp admin without MFA). LOGS: SnappyMail `AuthError[102]` at 00:22:26/00:22:49 from `ServiceSso → LoginProcess → imapConnect()`; nginx error.log me sirf purani symlink warnings (21:34) — naya error nahi. ROOT CAUSE: fake-IMAP daemon PID 1433780/1433782 **20:21:19** par start hua, APP_KEY rotation **21:57:42** me hui — daemon abhi bhi purane key se encrypted `email_accounts.password` decrypt kar raha hai → LOGIN par exception → socket EOF. Saboot: live 1143 par `portal:<session>` aur real password dono LOGIN → `socket error: EOF`; naya test daemon port 1144 par (naya APP_KEY) → dono LOGIN **OK**; fresh tinker process me decrypt OK. FIX PLAN (ijazat baqi): `systemctl --user restart alphaspace-fake-imap.service` + SSO re-test; long-running process ko config-change par auto-restart karne ke liye unit me `Restart=always` already hai, par rotation ke baad explicit restart runbook me daalna hoga. Firewall: `iptables -S OUTPUT | grep 993|587|445|2525|REJECT` → NO_RULES (koi test rule baqi nahi).',
    next: 'Aap fix ki ijazat dein → main fake-IMAP restart karke SSO end-to-end verify karunga.',
  },
  {
    id: 'B1', title: 'Sync ordering — recent-first vs oldest-first impact (20,000 mail)', status: 'PASS (design only)',
    evidence: 'ABHI: `SyncAccountEmailsJob.php:287` → `fetchEmailsSinceUid(..., 100)` per folder, oldest-first; `SyncAccounts.php` stale threshold `SYNC_STALE_MINUTES=15`. 20,000 mail = 200 passes × 15 min = **~50 hours** until newest mail mirrored (5-min stale par bhi ~16.7 h). DESIGN: naye mailbox par pehle `RECENT_DAYS` (default 30, max 90) ki mail **newest-first** fetch (page size 100), uske baad purani mail oldest-first backfill; per-folder watermark alag rakhein taake recent aur backfill ek dusre ko block na karein. Recent window config: `SYNC_RECENT_DAYS=30`. Feasibility: IMAP `SEARCH SINCE <date>` + `SORT DATE REVERSE` ya UID descending; provider support na ho to fallback to current oldest-first + alert.',
    next: 'Gate 1 se pehle implement task; koi code abhi nahi likha.',
  },
  {
    id: 'B2', title: 'Per-mailbox sync window + size cap/alert design', status: 'PASS (design only)',
    evidence: 'DESIGN: per-account columns/config `sync_after_date` (default null = all), `sync_max_mb` (default 512), `sync_recent_days` (default 30). Sync job har pass me cutoff + size budget check karega; cap cross hone par account ko `sync_status=backfill_limited` mark karke ops_event `mail.sync_cap_reached` (metadata only). Alert threshold 80% of per-mailbox cap aur 80% disk (Q7 channel}). Disk formula: `total ≈ accounts × min(mailbox_size, sync_max_mb) × 1.0 + Σ attachments_unique_hashes × avg_blob + ops/metrics overhead`; live calibration: **52 KB/email**, 100 mail/folder ≈ 5.2 MB, 6 folders ≈ 31 MB/account worst case; attachments 2.3 MB / 209 rows (content-addressed dedupe). 1,000 accounts × 100 mail ≈ 5.2 GB payload; 80 GiB free disk me safe, par buffer pool 4 GiB se bada ho jayega — stage gate.',
    next: 'Owner 512 MB/cap aur 30 din window confirm kare; phir migration + job change.',
  },
  {
    id: 'C', title: 'Attachment/SMTP limit consistency plan + busy 4xx + shared-mailbox override', status: 'PASS (design only)',
    evidence: 'CURRENT: SnappyMail `application.ini:42 attachment_size_limit = 2` MB; PHP `upload_max_filesize=80M`, `post_max_size=80M`; NGINX `client_max_body_size 60m`; relay `max_message_bytes=10 MiB` (wire size). Base64 inflation: 10 MiB decoded → **~13 MiB wire**, isliye 2 MB attachment bhi compose me blocked hai jabki relay 10 MiB allow karta hai — inconsistent. PLAN: set all four to one decoded cap of 10 MiB; relay wire cap = `ceil(10MiB × 4/3) × headers ≈ 14 MiB`, attachment UI limit = 10 MiB decoded; PHP/NGINX 60–80M rahein (upstream FE upload), relay final authority. Relay at `max_concurrent_clients` (10) par naye client ko **421 4.7.0 Server busy, try again** (4xx) dega — connection refuse nahi. Per-account daily override already config `overrides[account_id]`; shared mailbox ke liye `overrides[account_id] = {daily_recipient_limit, send_limit, user_daily_recipient_limit}` aur domain-level fallback `domain_overrides[domain]` — user (actor) aur account dono scopes alag-alag.',
    next: 'Approval ke baad config + SnappyMail ini + relay busy reply implement; 12 MB reject test dobara.',
  },
]

export default function QaAudit8() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 8' }]} />
      <PageHeader title="Q&A AUDIT 8" subtitle="SSO diagnose (sirf root cause) + sync ordering design + limits plan · koi fix/config change nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <strong>A: root cause mil gaya (fix nahi kiya).</strong> B aur C sirf design hain — Gate 1 se pehle implement honge.
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
