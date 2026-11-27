import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Gate 0 → Gate 1 evidence register — 2026-11-28. No secret values stored here. */
const ITEMS = [
  {
    id: 1, title: 'tryRecoverFromServerMove() hardening — proposal-only, same domain, TLS verified, alert',
    status: 'PASS',
    evidence: 'Code: `app/Support/HostMoveValidator.php:37 sameRegisteredDomain()`, `:62 tlsValid()` (stream_socket_client ssl://host:port, verify_peer=true, verify_peer_name=true, SNI, 5 s), `PublicHostGuard::assertPublic()` SSRF guard. `UpstreamImapService.php:224+` ab koi `imap_open`/`openWithGovernor`/`saveQuietly` nahi karta — sirf pending proposal insert (`imap_host_change_proposals`, dedupe), ops_event `imap.host_change_proposed` + `AlertChannelService::send(...)`. Command: `php artisan imap:host-change <id> --approve|--reject --force` (approve par dobara validation). Live: migration applied, table rows=0, accounts 803/804 hosts `mail.alphatach.com` unchanged, tests 129/129 pass, health 200. Credentials unverified host par nahi bheje gaye.',
    next: 'Operator ko proposal approve/reject process samjhana; Q7 alert channel PASS hone par proposed-host alert real delivery verify karo.',
  },
  {
    id: 2, title: 'SMTP relay spike — kya IMAP session token SMTP AUTH me reuse ho sakta hai?',
    status: 'PASS',
    evidence: 'RESULT: HAN. `portal-sso.php` SnappyMail ko `portal:<session_key>` password deta hai; `RainLoop/Model/Account.php:241` → `$oSettings->passphrase = $this->oSmtpPass ?: $this->oImapPass;` yani SMTP AUTH password IMAP password ka fallback hai. `Messages.php:161-164` me JS se per-send auth set karne wala code commented hai, isliye alag credential inject nahi kar sakte — lekin same session token dono jagah jata hai. `app/Support/SmtpGuard.php` already `^portal:([a-f0-9]{64})$` session validate karta hai (can_send + SendPermission). Domain JSON SMTP abhi real host par hai; loopback :2525 listener nahi hai (ss → NONE). DESIGN UPDATE: rate limit `10 sends/mailbox/5min` (Redis sliding window), daily cap `200 sends/mailbox` (DB counter, reset 00:00 UTC), deny par ops_event `mail.rate_limited`, audit log {account_id,user_id,message_id,decision} — koi secret nahi. IMPLEMENTATION NOT DONE. Effort: ~2–3 ghante + 1 controlled test window; risk: domain SMTP host changeSnappyMail config regenerate se overwrite ho sakta hai.',
    next: 'Approval par stub + can_send=0 + rate-limit test; phir domain JSON SMTP host loopback par switch.',
  },
  {
    id: 3, title: 'Seeders production guard + seed passwords code se hatayein + live DB confirm',
    status: 'PASS',
    evidence: '`DatabaseSeeder`, `UserSeeder`, `EmailAccountSeeder`, `DomainSeeder` me `app()->isProduction()` guard → live test output: `GUARD=Seeders are disabled in production.` (UserSeeder/DomainSeeder bhi). `grep -rnE "ChangeMe123!|\x27CHANGE_ME\x27" database/seeders` → NONE. Ab random values (`Str::password(24)`, `Str::random(...)`) ya env `PORTAL_BOOTSTRAP_ADMIN_PASSWORD`. Live DB: `seed_users_live=0 users_total=2` (sirf real accounts), tests 129/129 pass, health 200.',
    next: 'Koi nahi; seeders production me chalne par ab explicitly abort hote hain.',
  },
  {
    id: 4, title: 'Gate 1 ka order + har item ka test plan (abhi chalana nahi)',
    status: 'PASS',
    evidence: 'Doc: `docs/GATE1-PLAN.md` — 6 items ordered: (1) reboot test (systemd units + health + 2 LOGINs), (2) UIDVALIDITY staging throwaway account, (3) 2 real IMAP/SMTP integration tests, (4) exactly-one-copy test 2 domains par Message-ID se, (5) folder discovery inventory 3 providers par SPECIAL-USE vs hardcoded map, (6) \\Seen reverse sync dono taraf. Har item ke liye command, expected evidence aur rollback likha hai. Status: NOT STARTED by design.',
    next: 'Gate 0 Q7 (real alert) PASS + owner go-ahead ke baad hi Gate 1 shuru karein.',
  },
]

export default function QaAudit4() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 4' }]} />
      <PageHeader title="Gate 0 → Gate 1 — Q&A AUDIT 4" subtitle="4 items · PASS/FAIL · saboot ke saath · koi secret nahi · Gate 1 abhi shuru nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
            <strong>4 PASS.</strong> Gate 0 technical kaam complete; sirf Q7 (aapki alert values) aur key off-host copy aapke haath me hai. Gate 1 plan ready par NOT STARTED.
          </div>
          <div className="space-y-3">
            {ITEMS.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-surface/40 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone="success">{item.status}</Badge>
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
