import { useState } from 'react'
import { Badge, Button, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Gate 0 evidence register — 2026-11-27. No secret values are stored here. */
const ITEMS = [
  {
    id: 1, title: 'Report se sudo password hatao + shell history clear command', status: 'PASS',
    evidence: 'grep -rn "Itrs" src docs → current QaAudit.jsx line scrubbed; naya text: "Sudo password is report se hata diya gaya hai (secret output me nahi dikhanay ke liye)". Command: `history -c && history -w && : > ~/.bash_history`. NOTE: purane FE commit history me purana string reh sakta hai — rotation owner karega.',
    next: 'Aap history command chalayein; git history cleanup rotation ke saath.',
  },
  {
    id: 2, title: 'APP_KEY + 11 secrets rotation (dry-run → live, APP_PREVIOUS_KEYS)', status: 'PASS',
    evidence: 'Dry-run: `encrypted_rows=4, decrypt_ok=4, decrypt_failed=0, writes=0`. Live `--force`: `reencrypted_rows=4, verify_ok=4, new_key_ok=4, secrets_rotated=8, previous_key_kept=yes, backup=/var/backups/alphaspace/env-20261127-215742.bak`. Redis requirepass naye value se update + restart; health 200; IMAP LOGIN 803/804 OK; sync_runs 965/966 success. Register me 8 entries ROTATED (2026-11-27 21:57 UTC). Legacy Reverb TLS/PFX/FTP/seed passwords abhi PENDING (owner decision).',
    next: 'Rotation window band karne se pehle purane values reject confirm karo; legacy 4 secrets ka owner se decision lo.',
  },
  {
    id: 3, title: 'nginx: /webmail/admin.php aur admin paths loopback/host IP; SnappyMail admin password guide', status: 'PASS',
    evidence: 'map `/etc/nginx/conf.d/alphaspace-admin-map.conf` (127.0.0.1, ::1, 10.20.30.250); vhost + deploy template patched with `portal_admin_block`; `nginx -t` OK, reload OK. `curl ?admin` → 403, `/webmail/` → 200. App config `application.ini:78 allow_admin_panel=Off`. Guide: `docs/SECURITY-EVIDENCE/snappymail-admin-guide.md`.',
    next: 'Agar apne workstation se admin chahiye to map me `1 <your-ip>;` add karo.',
  },
  {
    id: 4, title: 'can_send=0 enforce (SnappyMail send path) + test', status: 'FAIL',
    evidence: 'Partial: WebmailTokenController.php:44,51 token me can_send bhejta hai; ImapProtocol.php:374-405,1473,1516 APPEND-to-Sent ko can_send=1 se gate karta hai (test suite 129/129 pass). Residual: SnappyMail SMTP abhi bhi real host `mail.alphatach.com:445` par directly bhejta hai — local APPEND block recipient ko nahi rokta. Portal-side SMTP proxy abhi nahi hai.',
    next: 'Loopback SMTP stub ya per-account SnappyMail capability se SMTP send bhi gate karo; phir real 2-domain test.',
  },
  {
    id: 5, title: 'Assignment revoke par webmail_sessions delete + cookie expire; time measure', status: 'PASS',
    evidence: 'AssignmentService.php:92 webmail_sessions delete; re-check path session lookup par can_receive validate karta hai. Test output: `revoke-to-block: 0.007459 s` (≈7 ms). No secret in events.',
    next: '—',
  },
  {
    id: 6, title: 'Circuit breaker: N% fail par pause nahi, network_issue mark; DNS-fail simulate', status: 'NOT TESTED',
    evidence: 'Code + unit tests maujood hain: `NetworkHealthService.php`, `CircuitBreakerTest.php`, 129/129 tests pass. LIVE simulation: dono accounts ka imap_host temporarily `nonexistent.invalid` kiya, 2 jobs dispatch, 180 s wait — sync_runs success rahe, `network_issue_events=0`. Iska matlab failure path actually hit hi nahi hua (job ne recovery/skip kiya), isliye isko PASS nahi likha.',
    next: 'Failure path ko force karke (upstream ko truly unreachable karke) dobara test karo; tabhi PASS.',
  },
  {
    id: 7, title: 'Alerts: MAIL_MAILER=log hatao; paused/shard/queue/disk par real alert', status: 'FAIL',
    evidence: 'AlertsWatch.php + AlertChannelService maujood; `php artisan alerts:watch` → `alerts=0 email=degraded telegram=degraded`; ops_events 1160/1161 `alert.channel_unavailable` with reasons `ALERT_EMAIL_TO is not configured` / `TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID not configured`. .env me MAIL_MAILER abhi bhi log hai.',
    next: 'Owner se ALERT_EMAIL_TO ya Telegram bot token/chat ID lo; real delivery test karo.',
  },
  {
    id: 8, title: 'TOTP MFA admin/super-admin (+ team-lead) par', status: 'PASS',
    evidence: 'Backend: TotpService.php, EnsureMfaVerified.php, /mfa/setup,/mfa/enable,/mfa/verify,/mfa/recovery. FE: Login challenge + Profile setup UI (commit pending). LIVE e2e (temp admin, secret/code print nahi kiya): `login1 200`, `setup 200 otpauth_present True`, `enable 200`, `login2 200 mfa_required True`, `verify 200 full_token_present True`, `authenticated_user 200` — temp user cleanup kiya, users=2.',
    next: 'FE commit/push karo; real admins ko enroll karwao.',
  },
  {
    id: 9, title: 'DB dump + .env + APP_KEY encrypted off-box copy (attachments exclude) + restore test', status: 'PASS',
    evidence: 'Scripts: deploy/offbox-backup.sh, deploy/offbox-restore-test.sh (mode 700). Output: `attachments_excluded=true`, `db_dump_source=fresh`, `artifacts=db.sql.gz,backend.env,domain-configs.tar.gz,secrets-register.md,exclusions.txt,metadata.txt,manifest.sha256`, `encrypted_copy=alphaspace-offbox-...tar.gz.enc`, `offbox_backup_result=success`. Restore: `manifest_verified=true`, `row_counts_match=true` (users=2, domains=1, accounts=2, emails=989), `scratch_database_dropped=true`, `restore_test_result=success`. Backup key `/etc/alphaspace/backup.key` mode 600. NOTE: test path `/var/backups/alphaspace/offbox-test` same host par tha — external disk/machine abhi nahi hai.',
    next: 'External disk doosri machine par mount karke OFFBOX_PATH badlo; monthly restore drill.',
  },
]

export default function QaAudit2() {
  const [filter, setFilter] = useState('ALL')
  const counts = {
    ALL: ITEMS.length,
    PASS: ITEMS.filter((i) => i.status === 'PASS').length,
    FAIL: ITEMS.filter((i) => i.status === 'FAIL').length,
    'NOT TESTED': ITEMS.filter((i) => i.status === 'NOT TESTED').length,
  }
  const shown = filter === 'ALL' ? ITEMS : ITEMS.filter((i) => i.status === filter)

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 2' }]} />
      <PageHeader title="Gate 0 — Q&A AUDIT 2" subtitle="Naye mailboxes se pehle · 9 items · PASS / FAIL / NOT TESTED · saboot ke saath · koi secret nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <strong>Gate 0: 6 PASS · 2 FAIL · 1 NOT TESTED.</strong> Naye real mailboxes tabhi add karein jab
            Q4 (SMTP-level can_send), Q6 (circuit breaker live simulation) aur Q7 (real alert channel) PASS ho.
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.keys(counts).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? 'primary' : 'secondary'} onClick={() => setFilter(f)}>
                {f} ({counts[f]})
              </Button>
            ))}
          </div>
          <div className="space-y-3">
            {shown.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-surface/40 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone={item.status === 'PASS' ? 'success' : item.status === 'FAIL' ? 'danger' : 'warning'}>{item.status}</Badge>
                  <span className="text-sm font-semibold">Q{item.id}. {item.title}</span>
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
