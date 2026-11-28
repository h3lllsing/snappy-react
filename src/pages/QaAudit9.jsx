import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** A/B/C execution register — 2026-11-28. No secret values stored here. */
const ITEMS = [
  {
    id: 'A', title: 'SSO fix: stale processes restart + live verification + runbook + canary', status: 'PASS',
    evidence: 'Rotation 21:57:42 se pehle start hue: idle@1-4 (01:06), fake-IMAP parent+child (20:21:19), php-fpm master (26th 22:42). Queue x8 (00:58), idle@0/@5 (21:57/21:58), smtp-relay (00:55) naye the. Sab stale user units restart + `sudo systemctl reload php8.3-fpm`. Config cache vs .env APP_KEY sha256 identical (d1c8e333…). `loginctl enable-linger masood` → Linger=yes (saare units enabled-at-boot: queue/idle/relay/fake/scheduler timer + system nginx/mysql/redis/php-fpm/fail2ban). LIVE VERIFY (naye process): token 200 → portal-sso 200 → hash POST 200/302; 1143 par `portal:<session>` LOGIN 803 (960 msgs) + 804 (18 msgs) OK; sync_runs 1002/1003 success (decrypt OK); IDLE 803/804 connected. Purane failures: failed_jobs 49/50 (22:23 IMAP fail), sync_runs 974-978, issue 869 (MAC invalid) — sab resolved/recorded. Runbook `docs/SECURITY-EVIDENCE/rotation-runbook.md` me mandatory restart+SSO smoke add. Canary: `alerts:watch` har run synthetic LOGIN 1143 (short-lived session row, delete same call), fail par `imap.canary_failed` + alert; ab `alerts=0 canary_events=0`. Firewall`: NO_RULES (993/587/445/2525 clean).',
    next: 'Koi nahi — A complete.',
  },
  {
    id: 'B', title: 'Sync ordering: recent-first + backfill-only cap + disk-derived default', status: 'PASS',
    evidence: 'CODE: `SyncAccountEmailsJob.php` recent phase (RECENT_DAYS=30, max 90) newest-first (`UpstreamImapService::fetchRecentEmails` UID desc) har pass, backfill cap sirf uspar; `sync_max_mb` per-account override; `recent_uid_synced` alag watermark; cap par `mail.sync_cap_reached` ops_event. Fake IMAP UIDs upstream se hain (`fetchEmailsSinceUid` upstream UID store karta hai) — insertion order se IDLE EXISTS detection aur watermark safe. DERIVED DEFAULT: `SyncBudget::maxMbFor()` = (free_disk*0.6)/planned_accounts = **48 MB/mailbox** (80 GiB free, 1000 planned) ≈ 900 mails at 52 KB/mail; 200 accounts par ~240 MB. REAL TEST: cap=1 MB par backfill limited, phir 804→803 naya mail bheja → 803 INBOX UID 1180 mirror ho gaya (`emails.id=9232`), cap events 6. 155/155 tests.',
    next: 'Owner planned_accounts (1000 vs 200) confirm kare; naye mailboxes sync_enabled=0 ke saath add ho.',
  },
  {
    id: 'B4', title: 'Emails body/header size split + bodies alag table ka plan (design only)', status: 'PASS (design)',
    evidence: 'LIVE: 1012 rows — raw 41.7 MB, body_text 2.8 MB, body_html 6.8 MB, metadata (subject/from/to) 0.13 MB → **99.8% payload body**. Plan `docs/DATA-MODEL.md` me: `email_bodies` table (email_id PK/FK, raw LONGTEXT, body_text, body_html, body_structure, content_hash) — fake IMAP FETCH par lazy join, content-addressed dedupe, migration/backfill steps; abhi schema change nahi kiya.',
    next: 'Approval par migration + backfill + fake-IMAP lazy load.',
  },
  {
    id: 'C', title: 'Limits consistency + busy 421 + shared mailbox override', status: 'PASS',
    evidence: 'SnappyMail `application.ini:42 attachment_size_limit = 10`; relay `decoded_cap_bytes=10485760`, `max_message_bytes=14046550` (~14 MiB wire, base64 4/3 + header allowance), `max_concurrent_clients=10`; `snappy:generate-domains --check` PASS. Decoded-size accounting transfer-encoding aware (base64 3/4, quoted-printable/plain 1:1). REAL TESTS: 9 MiB decoded → accepted + inbox copy 1; 12 MiB → `552 5.2.3 Message too large (limit 10 MiB)` + 0 copies; 11 concurrent clients → 11th `421 4.7.0 Server busy, try again` (busy_count=1). Shared-mailbox override config `shared_mailbox_account_ids` + per-account/domain/user caps. 155/155 tests.',
    next: 'Aapka external-recipient SPF/DKIM/DMARC test baaki hai.',
  },
]

export default function QaAudit9() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 9' }]} />
      <PageHeader title="Q&A AUDIT 9" subtitle="A fix + B/C implementation · sab real saboot · koi secret nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
            <strong>A PASS · B PASS · C PASS.</strong> Naye mailboxes abhi add nahi kiye. Gate 1 inventory aapki list ka intezaar kar raha hai.
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
