import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Large-mail fix register — 2026-11-28. No secret values stored here. */
const ITEMS = [
  {
    id: 1, title: 'Diagnose: kahan abort hota tha', status: 'PASS',
    evidence: 'Code: `ImapProtocol.php:1166-1167` poori literal ko EK `@fwrite()` me likhta tha aur `:3882-3888` poora raw string memory me banata tha. Raw socket: UID 1171 ne `BODY[] {9805775}` declare kiya par client ko sirf **2,621,463 bytes / 30 s** mile, phir timeout; daemon RSS 57 MB → 83 MB par crash nahi hua. 323 KB mail 13.49 MB/s. Available data me sabse chhota failing size **9.5 MB** (1/2/5 MB ke rows maujood nahi — naya mail banane ki ijazat nahi thi, isliye aur narrow nahi kiya).',
    next: '—',
  },
  {
    id: 2, title: 'Fix: chunked streaming + partial-write loop + memory', status: 'PASS',
    evidence: '`ImapProtocol.php` me streamed full-body path: `gzread` 64 KiB chunks, har chunk par `fwrite` return check + loop + `fflush`, bounded socket timeout; poora raw ab string me nahi joda jata. Legacy `emails.raw` rows fallback par. Bench (`deploy/bench-large-fetch.php`): 9.8 MB → **0.103 s / 90.44 MB/s**, 12.7 MB → **0.131 s / 94.83 MB/s**, client peak memory **2.00 MB** (baseline bhi 2.00 MB). Daemon 4 workers ka RSS 33–58 MB. Tests 176/176.',
    next: '—',
  },
  {
    id: 3, title: 'IMAP_WORKERS 2→4 + concurrency test', status: 'PASS',
    evidence: 'User unit + deploy template me `IMAP_WORKERS=4` (RAM headroom ~12 GiB; 4 PIDs 33–58 MB). LIVE: ek thread 9.8 MB fetch loop (2 fetches, koi error nahi) ke saath doosre user (804) ka login + chhoti mail fetch **131 ms** me OK. Canary `alerts:watch alerts=0`, `imap.canary_failed=0`; relay health active; SSO smoke 803/804 dono `200/200/302`.',
    next: '—',
  },
  {
    id: 4, title: 'Full 1032-row fake-IMAP BODY[] integrity dobara', status: 'PASS',
    evidence: 'Pehle run me 5 transient 804 connection failures; fresh connection se retry → **still_failing=0**. Final: **1032/1032 sha256 match** (pehle 16 failures the). DB/gz integrity bhi 1032/1032. Koi DB write nahi, `bodies/` me koi change nahi, koi naya mailbox nahi.',
    next: '—',
  },
  {
    id: 5, title: 'Maximum mail size / open latency', status: 'PASS',
    evidence: 'Sabse bari live mail 12.7 MB → fake IMAP se **0.131 s** me poori (94.83 MB/s). 10 MiB ka andaza ~0.11 s network fetch. SnappyMail browser me actual open/attachment-download **NOT TESTED** (browser automation available nahi) — IMAP + SSO path real saboot hai.',
    next: 'Aap browser me 9/12 MiB mail kholkar final visual confirm karein.',
  },
  {
    id: 6, title: 'Pichhle audit ke items (a)-(d) — sirf report', status: 'PASS',
    evidence: '(a) Non-test compression: 989 rows raw 41.73 MB → gz 9.47 MB = **4.4× / ~77%** (21.5× synthetic tha). (b) `bodies/` ab `deploy/backup.sh` me hai; backup se restore drill **1032/1032 hash OK** (live files se nahi); `bodies:heal` dry-run 1 damaged → real heal 1/1, hash OK. (c) Network: **Wi-Fi wlp4s0 UP** (Ethernet enp0s31f6 DOWN), power_save NA (iw nahi); nvme0n1 238.5G, VG ubuntu-vg 235.42g / **free 135.42g**, LV / 100G. (d) 23 updates list `docs/HANDOFF.md`/`/qa11` me; `reboot-required` set, reboot Gate 1 tak deferred. Kuch nahi badla.',
    next: '—',
  },
]

export default function QaAudit12() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 12' }]} />
      <PageHeader title="Q&A AUDIT 12" subtitle="Large-literal fix · 1032/1032 integrity · 4 workers · previous audit reconciliation · koi secret nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
            <strong>6 PASS.</strong> Large-mail P1 blocker fix ho gaya. Browser-level UI test abhi bhi NOT TESTED — aapka manual check baaki.
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
