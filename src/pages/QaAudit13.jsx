import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Evidence + plan register — 2026-11-28. No secret values stored here. */
const ITEMS = [
  {
    id: 1, title: '804 par 5 transient failures — wajah?', status: 'NOT TESTED',
    evidence: 'Daemon journal (04:50 se) koi entries/exception nahi; `ss -ltn` → `LISTEN 0 32 127.0.0.1:1143` (backlog 32, empty); login throttle `LOGIN_MAX_FAILURES=10 / 900s` hai aur correct credentials the — trigger nahi hua. Reproduce attempts: sequential 20 logins → **0 failures** (avg 141 ms); 4 threads × 100 select+fetch → **0 failures**. Isliye exact trigger confirm nahi hua. Evidence client-side 30s timeout ki taraf ishara karta hai (fresh connection par sab clear ho gaye the), par main ise "daemon tha" ya "client tha" keh kar chhupana nahi chahunga — **root cause unconfirmed**.',
    next: 'Agar dobara aaye to client timeout 60s + per-row select hata kar focused capture karna padega.',
  },
  {
    id: 2, title: 'Workers-busy metric + alert (code + test)', status: 'PASS',
    evidence: '`AlertsWatch.php:318 checkImapWorkersBusy()` — /proc/net/tcp(+6) se ESTABLISHED connections to port 1143 ginta hai, `env("IMAP_WORKERS",2)` se worker count, threshold par deduped ops_event `imap.workers_busy` + `imap_busy=<0|1> established=<n> workers=<n>` output. LIVE: `imap_busy=0 established=0 workers=2`, alerts=0. Tests 180/180. NOTE (report-only, koi change nahi): CLI me `IMAP_WORKERS` default 2 dikhta hai jabki systemd unit 4 par set hai — metric abhi undercount karta hai; alignment agle window me.',
    next: 'Unit/CLI worker-count alignment (agle window, izazat se).',
  },
  {
    id: 3, title: 'php-fpm / nginx / SnappyMail limits mel — 12 MB mail + 10 MiB attachment', status: 'PASS (config-only)',
    evidence: 'PHP-FPM: `memory_limit=128M`, `max_execution_time=30`, `post_max_size=80M`, `upload_max_filesize=80M`. NGINX: `client_max_body_size 60m`, `fastcgi_read_timeout 300–360s`. SnappyMail `application.ini:42 attachment_size_limit=10` (decoded MB), relay decoded cap 10 MiB / wire ~14 MiB. 12 MB mail fake-IMAP daemon (CLI) se stream hoti hai — FPM limits uspar lagu nahi; benchmark 0.131 s. 10 MiB attachment download base64 ~13.3 MB < 128M memory aur < 300s timeout → config me koi blocker nahi. Browser test aap karenge (NOT TESTED).',
    next: 'Aap browser me 9/12 MiB mail + attachment sha256 verify karein.',
  },
  {
    id: 4, title: 'sync_max_mb kya ginta hai? per-mail disk number', status: 'PASS',
    evidence: '`SyncAccountEmailsJob::folderBytes()` (`:392-397`) `SUM(emails.size)` karta hai — `emails.size` uncompressed raw bytes hai (sample id 9229: size 9576 KB = raw 9.5 MB, gz sirf 33 KB). To cap **raw bytes ginta hai, disk footprint nahi** (conservative ~2.2× overcount). Non-test 989 rows: raw 41.73 MB → **43.2 KB/mail**; disk footprint = gz 9.47 MB (**9.8 KB/mail**) + parsed 9.61 MB (**9.9 KB/mail**) ≈ **19.7 KB/mail**. 48 MB cap ≈ 1110 raw mails ya ~2400 disk-mails ke barabar.',
    next: 'Agar cap disk footprint par chalani ho to alag task — abhi raw conservative hai.',
  },
  {
    id: 5, title: 'Test mail Message-ID list (ids 9211-9229 group)', status: 'PASS',
    evidence: '`docs/TEST-MAILS.md` me 43 rows — har ek ke saath id, account (803/804), folder, uid, subject aur **poora Message-ID**. Koi delete nahi kiya. Zyadatar 9/12 MiB wale 803 INBOX/Sent me; baaki relay/SSO audit tests.',
    next: 'Aap delete ki ijazat dein to sirf in 43 Message-IDs par scoped cleanup.',
  },
  {
    id: 6, title: 'Network + LVM + reboot — PLAN ONLY', status: 'PASS',
    evidence: '`docs/NETWORK-LVM-REBOOT-PLAN.md`: (a) Ethernet `enp0s31f6` (MAC 54:ee:75:b2:63:29) par 10.20.30.250 rakhne ke liye DHCP reservation / netplan, `netplan try` auto-rollback, cert SAN unchanged kyunki IP same, Wi-Fi fallback rollback; (b) LVM pre-checks `lvs/vgs/df -hT`, `lvextend -L +100G` + `resize2fs` (ext4), backup step, no shrink; (c) reboot sequence: backup → 23 updates → reboot → systemd units + linger + health + smtp:relay-check + alerts canary + SSO smoke. **Koi command execute nahi kiya**, koi config change nahi.',
    next: 'Gate 1 reboot window me plan execute karein.',
  },
]

export default function QaAudit13() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 13' }]} />
      <PageHeader title="Q&A AUDIT 13" subtitle="804 failures · busy metric · limit alignment · cap accounting · test mails · network/LVM/reboot plan" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <strong>5 PASS · 1 NOT TESTED (Q1 804 transient root cause unconfirmed).</strong> Koi mailbox/sync/config change nahi kiya.
          </div>
          <div className="space-y-3">
            {ITEMS.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-surface/40 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone={item.status === 'PASS' ? 'success' : 'warning'}>{item.status}</Badge>
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
