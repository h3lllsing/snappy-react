import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Follow-up evidence register — 2026-11-28. No secret values stored here. */
const ITEMS = [
  {
    id: 1, title: 'SMTP port 445 → 587: kab/kisne/kyun? 445 ya 587 kaunsa kaam karta hai? Alert aaya?', status: 'PASS',
    evidence: 'Binlog (mysqlbinlog --base64-output=DECODE-ROWS -vv): `### INSERT INTO roundportal.email_accounts` at `#261126 1:24:02`, `SET TIMESTAMP=1795656242`, `### @10=587` — yani 587/tls account creation se tha, kabhi UPDATE nahi hua. 445 sirf purani SnappyMail domain JSON me tha (stale generated config), DB me nahi. Live: `mail.alphatach.com:445` → ConnectionRefusedError; `587 STARTTLS LOGIN` → 235. Runbook alert host/port *change* par tha — change hua hi nahi, isliye koi alert expected nahi tha. `smtp.relay_down` event (1203, 23:47) alag relay probe tha.',
    next: 'Koi nahi — domain JSON ab loopback par pin hai, upstream DB se 587/tls.',
  },
  {
    id: 2, title: 'Per-user recipient cap (sab mailboxes ka jama), configurable', status: 'PASS',
    evidence: 'Pehele per-user counter tha par account limit (200) hi use karta tha. Ab `config/smtp-relay.php:27 user_daily_recipient_limit=500` (env `SMTP_RELAY_USER_DAILY_LIMIT`), `SmtpGuard::checkDailyRecipientLimit()` user counter ke liye ye alag limit lagata hai. User counter key `smtp-relay:rcpt:user:<user_id>:<day>` — saare accounts ke recipients jama hote hain. Domain override bhi is key ko support karta hai. Tests 144/144 pass.',
    next: 'Owner 500/day limit review karein; per-domain override tab set karein jab kisi provider ka constraint pata ho.',
  },
  {
    id: 3, title: 'Relay concurrency, idle/command timeout, DATA cap 552, per-domain override', status: 'PASS',
    evidence: 'Config: `max_concurrent_clients=10` (env configurable, server.php bounded accept loop), `client_idle_seconds=60`, `command_timeout_seconds=30`, `max_message_bytes=10 MiB`, `domain_overrides=[]`. `SmtpGuard` 552 reply deta hai: `552 5.2.3 Message too large (limit 10 MiB)`. REAL TEST: 12,909,985-byte message bheji → `SMTPDataError (552, 5.2.3 Message too large (limit 10 MiB))`, inbox copies=0. Tests 144/144.',
    next: 'Provider ke actual submission limit ke mutabiq domain override set karein (abhi default 10 MiB).',
  },
  {
    id: 4, title: 'Relay health alert + auto-restart', status: 'PASS',
    evidence: '`alerts:watch` already `smtp.relay_down` ops_event emit karta hai (event 1203 dekha gaya). Unit `alphaspace-smtp-relay.service` me `Restart=always`, `RestartSec=5`. LIVE TEST: `kill -9` pid 1491190 → 9 sec baad naya pid 1491371 (`AUTO_RESTART=YES`), unit active, `smtp:relay-check` → `active host=127.0.0.1 port=2525`. Real email/Telegram delivery abhi degraded hai (Q7 owner values ka intezaar).',
    next: 'Aap alert values bharne ke baad relay-down alert ka real delivery test karein.',
  },
  {
    id: 5, title: 'Gate 1 inventory tayyari — sync_enabled=0 aur initial fetch size/limit', status: 'NOT STARTED',
    evidence: 'Koi naya mailbox abhi add nahi kiya; existing 803/804 flags unchanged (sync_enabled=1). Naye mailboxes `sync_enabled=0` ke saath add honge — sync nahi chalega. Initial fetch: `SyncAccountEmailsJob.php:162` har discovered canonical folder par chalata hai; `:287` `fetchEmailsSinceUid(..., 100)` — **100 messages per folder per pass**, oldest-first, watermark per folder; baaki agle passes me. Live average 52 KB/email → ~5.2 MB per 100-mail folder; 6 folders ≈31 MB/account worst case; attachments 2.3 MB (209 rows, content-addressed dedupe, >5 MB lazy). Read-only inventory (LIST/XLIST) kabhi bhi chal sakta hai — sync enable nahi karunga.',
    next: 'Aap mailbox list dein → read-only table bharunga; uske baad Gate 1 sequence.',
  },
]

export default function QaAudit7() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 7' }]} />
      <PageHeader title="Q&A AUDIT 7" subtitle="SMTP port history · relay limits · health · Gate 1 tayyari · koi secret nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
            <strong>4 PASS · 1 NOT STARTED.</strong> Relay ab limits + auto-restart ke saath production-ready hai. Gate 1 sirf mailbox list ke baad.
          </div>
          <div className="space-y-3">
            {ITEMS.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-surface/40 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone={item.status === 'PASS' ? 'success' : 'warning'}>{item.status}</Badge>
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
