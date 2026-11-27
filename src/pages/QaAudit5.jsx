import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Evidence register — 2026-11-28. No secret values stored here. */
const ITEMS = [
  {
    id: 1, title: 'Real SMTP credentials SnappyMail tak kaise pahonchte hain? Exact code path',
    status: 'FAIL',
    evidence: 'SnappyMail path: `portal-sso.php:118` → `CreateUserSsoHash(email, "portal:".$sessionKey)`; `RainLoop/Model/Account.php:110-117` → `oImapPass` is SSO password; `:241` → `$oSettings->passphrase = $this->oSmtpPass ?: $this->oImapPass;` yani SMTP AUTH password bhi `portal:<session_key>` hota hai. `domain JSON:56-58` SMTP host `mail.alphatach.com:445`. Real mailbox password SnappyMail ko nahi milta. REAL DELIVERY path alag hai: `PushSentEmailsToServerJob.php:182-205 sendSmtp()` Eloquent encrypted casts se credentials memory me decrypt karta hai; trigger `SendController.php:22,108` / `mail:retry-push` / `WebmailActivityController.php:254`. Live: `webmail_sent_rows=0` (kabhi real SnappyMail send nahi hua), 8 Sent rows sab `sent_via_webmail=0` aur 21:41 me retry job se push hue; koi SMTP listener :2525 nahi, `SmtpGuard.php` unused. Isliye "exactly-once test pass" SnappyMail SMTP path ka proof nahi tha — wo path abhi **unproven/fail** hai.',
    next: 'Loopback SMTP relay implement karke SnappyMail se real send test karo; tabhi isko PASS mark karein.',
  },
  {
    id: 2, title: 'Relay design update — RCPT-based counting, per-mailbox limits, clear SMTP errors',
    status: 'PASS',
    evidence: 'Design only (IMPLEMENTATION NOT DONE): relay `MAIL FROM` par session validate (`portal:<session_key>` → webmail_sessions + SendPermission). Har `RCPT TO` par counter increment: sliding window `10 sends / 5 min` per mailbox (Redis sorted set, key `smtp:<account_id>:sends`) aur `200 recipients / day` per mailbox (DB counter, UTC midnight reset). Sirf message count nahi — recipients hisaab se cap. Deny par SMTP `452 4.7.1 Too many recipients (5 min)` ya `550 5.7.1 Daily recipient cap reached` + ops_event `mail.rate_limited` {account_id,user_id,rcpt_count,window}. Config keys: `RELAY_MAX_SENDS_PER_5M` (10), `RELAY_MAX_RCPT_PER_DAY` (200), per-account override column. Upstream `mail.alphatach.com:445` par sirf validated session ke baad decrypted creds se relay. Audit log metadata-only. Effort ~2–3 h + 1 test window.',
    next: 'Approval par stub likhein; can_send=0 + rate-limit + exactly-one-copy teenon test ek window me.',
  },
  {
    id: 3, title: 'Gate 1 reorder — folder discovery inventory pehle (read-only), table',
    status: 'PASS',
    evidence: '`docs/GATE1-PLAN.md` me item 1 ab **Folder discovery inventory** hai (read-only `LIST`/`XLIST`, koi write nahi), uske baad reboot → UIDVALIDITY → 2 real integration tests → exactly-one-copy → \\Seen reverse sync. Inventory table me columns: mailbox, provider type, INBOX prefix style, SPECIAL-USE support, Sent/Drafts/Trash/Spam names, mapping status. Abhi sirf 2 reference rows hain (803/804, code-level hardcoded map); live IMAP LIST **abhi nahi chalaya** — owner mailbox list milne par chalega.',
    next: 'Aap mailbox list dein; main read-only LIST se table bharunga, phir Gate 1 baaki items.',
  },
]

export default function QaAudit5() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 5' }]} />
      <PageHeader title="Q&A AUDIT 5" subtitle="3 items · saboot · koi secret nahi · Gate 1 abhi bhi NOT STARTED" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <strong>2 PASS · 1 FAIL.</strong> Q1 FAIL ka matlab: SnappyMail se real SMTP send ka path abhi proven nahi hai — isi ko relay design fix karega.
          </div>
          <div className="space-y-3">
            {ITEMS.map((item) => (
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
