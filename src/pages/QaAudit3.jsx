import { useState } from 'react'
import { Badge, Button, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Gate 0 follow-up evidence register — 2026-11-27. No secret values are stored here. */
const ITEMS = [
  {
    id: 1, title: 'Q6 — imap_host=nonexistent.invalid par sync_runs success kaise? + real iptables REJECT test',
    status: 'PASS',
    evidence: 'Saboot (pehla sim): UpstreamImapService.php:226-280 → imap_open fail par tryRecoverFromServerMove() DNS/MX se real host nikal ke connect karta hai (imap_provider_connections me sirf mail.alphatach.com rows, 515-522 success). Real test: `iptables -I OUTPUT -p tcp --dport 993 -j REJECT` (rule count 1), cooldown clear, 2 jobs dispatch, 9 min wait → `sync_status=network_issue`, `sync_error=upstream network issue (shared)`, `sync_enabled=1` (pause nahi), `failed_runs=6`, `network_issue_events=1`. Trap se rule hata diya (`iptables_993_rules=0`); imap_host wapas `mail.alphatach.com:993`, status idle, recovery sync_runs 979/980 success, health 200.',
    next: 'Koi nahi — circuit breaker verified.',
  },
  {
    id: 2, title: 'Q3 — /webmail/?admin doosre LAN IP se test ka tareeqa; kis layer ne 403 diya?',
    status: 'PASS',
    evidence: 'Live evidence: nginx map allow-list me host IP hai aur vhost me admin block hai, phir bhi `curl -k -D - "https://10.20.30.250/webmail/?admin"` → `HTTP/1.1 403 Forbidden`, `Server: SnappyMail`, aur koi `X-Portal-Admin-Block: nginx` header nahi — matlab 403 **app layer** (SnappyMail `application.ini:78 allow_admin_panel=Off`) se aaya, nginx se nahi. Doosre LAN PC se test: `curl -k -i "https://10.20.30.250/webmail/?admin"` aur `curl -k -i "https://10.20.30.250/webmail/"` — admin 403 aur normal 200 hona chahiye. Agar aapka IP allow karna hai: `/etc/nginx/conf.d/alphaspace-admin-map.conf` me `1 <your-ip>;` add karke `nginx -t && systemctl reload nginx`.',
    next: 'Aap apne LAN PC se upar dono curl chalayein; header check karein.',
  },
  {
    id: 3, title: 'Q4 — loopback SMTP relay design (token auth, can_send check, real SMTP, audit) — design only',
    status: 'PASS',
    evidence: 'Design ready, IMPLEMENTATION NOT DONE (aapne sirf design maanga tha): (1) portal-sso.php SnappyMail account ke SMTP AUTH username ko `<account_id>:<portal_session_key>` kare aur password ko random per-session value; (2) 127.0.0.1:2525 par chhota SMTP stub (Python aiosmtpd / PHP socket) AUTH username parse karke webmail_sessions validate kare, phir email_account_user.can_send=1 check kare — deny par 535 + ops_event `mail.send_denied`; (3) allow hole par real SMTP (`mail.alphatach.com:445`, TLS verify on) se encrypted credentials se relay kare, RCPT/headers sanitize; (4) har relay ka ops_event {account_id,user_id,message_id,decision}, ONLY metadata; (5) domain JSON SMTP host=127.0.0.1 port=2525, CA/cert unchanged. Effort: ~6–10 engineering hours + 1 controlled test window; risk: SnappyMail per-session SMTP AUTH override is the main unknown (2–3 h spike needed).',
    next: 'Approval par pehle 1 test account par stub + can_send=0 test, phir rollout.',
  },
  {
    id: 4, title: 'Q2 cleanup — old env backup, APP_PREVIOUS_KEYS drop condition, seed password users',
    status: 'PASS',
    evidence: 'Old backup: `/var/backups/alphaspace/env-20261127-215742.bak` mode `600 masood:masood` (already secure). Plan: rotation window (7 din) ke baad, jab new-key-only decrypt verify ho aur old values reject confirm ho, to `shred -u` ya secure delete + ops_event `security.backup_purged`; tab tak retain. APP_PREVIOUS_KEYS abhi `.env` me hai (rollback ke liye) — hatane ki condition: (a) 7 din tak koi decrypt failure nahi, (b) `security:rotate-secrets --dry-run` me `previous_keys=0` aur `decrypt_failed=0`, (c) owner sign-off. Seed-password users (emails only, LIVE users nahi): sales@xuz.com, support@xuz.com, orders@xuz.com, info@xyz.com, billing@xyz.com, contact@alphatach.com, hello@oceanbookhouse.com, bilal@alphatach.com, ali@xuz.com, waqar@xyz.com (database/seeders). Live users=2 (real accounts).',
    next: 'Owner 7-din window ke baad previous key drop aur seed backup purge authorize kare.',
  },
  {
    id: 5, title: 'Q8 — FE MFA deploy + artisan reset command',
    status: 'PASS',
    evidence: 'FE commit `5ce8906` pushed; served JS `index-Bf81hOGy.js` == local dist, git clean. MFA e2e earlier PASS (login challenge → verify → token). NEW command: `app/Console/Commands/MfaReset.php` → `php artisan mfa:reset <email> --force`; dry run without --force: `no changes (pass --force to confirm)`. Live test with marker user: `secret_null=yes enabled_null=yes`, ops_event `mfa.reset`, temp user cleaned.',
    next: 'Kisi admin ka TOTP lock ho jaye to ye command use karein.',
  },
  {
    id: 6, title: 'Q9 — backup.key alag copy + external disk par OFFBOX_PATH test',
    status: 'PASS',
    evidence: 'Second copy: `/root/alphaspace-backup.key.copy` mode `600 root:root`, `cmp -s` → `copies_identical=yes`. Method: key ko kabhi backup set ke saath mat rakhein; doosri machine/password manager me alag se store karein, rotate par dono copies badlein. External disk abhi mount nahi hai — isliye test `/var/backups/alphaspace/offbox-test` (same host) par chalaya: `attachments_excluded=true`, `manifest_verified=true`, `row_counts_match=true`, `restore_test_result=success`.',
    next: 'External disk mount hone par `OFFBOX_PATH=/mnt/offbox/alphaspace` ke saath dono scripts dobara chalayein.',
  },
  {
    id: 7, title: 'Q7 — alert channel ke exact .env variables + alerts:watch test',
    status: 'FAIL',
    evidence: 'Exact names (config/alerts.php:30-43): `ALERT_EMAIL_TO` (comma-separated), `ALERT_COOLDOWN_MINUTES`, `ALERT_ACK_SLA_MINUTES`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_API_URL`, `ALERT_QUEUE_DEPTH` (100), `ALERT_DISK_PERCENT` (80), `ALERT_PAUSED_ACCOUNTS` (1), `ALERT_SHARD_DOWN_MINUTES` (5), `ALERT_SHARD_IDS`, `ALERT_DISK_PATH`. Current: `ALERT_EMAIL_TO=` (empty), `TELEGRAM_BOT_TOKEN=` (empty), `TELEGRAM_CHAT_ID=` (empty), `MAIL_MAILER=log`. `php artisan alerts:watch` → `alerts=0 email=degraded telegram=degraded`; ops_events 1160/1161 `alert.channel_unavailable`.',
    next: 'Aap in 3 values bhar ke `php artisan alerts:watch` chalayein; phir real delivery PASS mark karein.',
  },
]

export default function QaAudit3() {
  const [filter, setFilter] = useState('ALL')
  const counts = {
    ALL: ITEMS.length,
    PASS: ITEMS.filter((i) => i.status === 'PASS').length,
    FAIL: ITEMS.filter((i) => i.status === 'FAIL').length,
  }
  const shown = filter === 'ALL' ? ITEMS : ITEMS.filter((i) => i.status === filter)

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 3' }]} />
      <PageHeader title="Gate 0 follow-up — Q&A AUDIT 3" subtitle="7 items · har jawab PASS/FAIL · saboot ke saath · koi secret nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <strong>6 PASS · 1 FAIL.</strong> Sirf Q7 (real alert channel) aapki values ka intezaar kar raha hai.
            Naye mailboxes se pehle Q7 ko PASS karna hai.
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
                  <Badge tone={item.status === 'PASS' ? 'success' : 'danger'}>{item.status}</Badge>
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
