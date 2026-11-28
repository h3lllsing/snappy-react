import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Evidence register — 2026-11-28. No secret values stored here. */
const ITEMS = [
  {
    id: 1, title: 'Numbers reconcile + non-test compression/projection', status: 'PASS',
    evidence: 'Audit 9 (1012 rows, raw 41.7 MB) aur Audit 10 (100 rows, 176.23 MB) ka farq: **Audit 9 ke baad 9/12 MB test mails aaye**. Same query pre-bodies dump par: full 1032 rows raw 216.30 MB, top-100 176.23 MB (Audit 10 number). Sabse bade 20 rows: 16 TEST (12,768 KB ×8, 9,576 KB ×8 — `e2e-12mb2`/`e2e-9mb`/`dbg12`), 4 real (323/146/143/132 KB). TOTAL raw 216.3 MB → gz 10.08 MB = 21.5× (synthetic heavy). **NON-TEST 989 rows: raw 41.73 MB → gz 9.47 MB = 4.4×, ~77% saving** — ye real projection hai. Per real mail ~43 KB raw / ~9.8 KB gz; 1000 accounts ×100 mails ≈ 4.3 GB raw / ~1 GB gz.',
    next: 'Synthetic 21.5× number hata diya — projection ab non-test 4.4× par based.',
  },
  {
    id: 2, title: 'bodies/ backup + restore drill FROM BACKUP + missing-gz self-heal', status: 'PASS',
    evidence: '`deploy/backup.sh` me `BODIES=storage/app/private/bodies` add; backup 20261128-042040 me `bodies_*.tar.gz` (600). Restore drill **sirf backup se** (live files nahi): db dump scratch + bodies tar temp → `from_backup_checked=1032 failures=0`, scratch/temp delete. Self-heal command `bodies:heal --account=803 --dry-run` → `1 body row(s) need healing`; real run → `1 damaged, 1 healed, 0 failed`; `healed_hash_ok=yes`, file dobara maujood. Tests 171/171.',
    next: 'Monthly drill me bodies tar bhi include karein.',
  },
  {
    id: 3, title: '19 failures: script ya daemon? 9 MiB throughput + SnappyMail UI test', status: 'FAIL',
    evidence: 'FULL CHECK: 1032 rows, pehle 19 failures; 180s timeout + fresh connection se retry par **16 abhi bhi fail (`abort`)** — sab 9/12 MiB test mails (ids 9211-9229 group). Baaki 1016/1032 IMAP `BODY[]` sha256 match. DB/gz integrity 1032/1032 PASS hai — masla sirf fake IMAP large-literal response me hai. Chhote real mail (323 KB) throughput **4.9 MB/s**. 9 MiB ka MB/s measure nahi ho paya (connection EOF) → **NOT TESTED**. SnappyMail me bari mail kholne ka browser-level real test bhi **NOT TESTED** (browser automation available nahi). Code padh kar/unit test se PASS nahi likha.',
    next: 'Fix P1: fake IMAP large-literal streaming/response ka diagnosis + controlled browser test — agle window me; yahan tak badi mail webmail me open nahi ho sakti.',
  },
  {
    id: 4, title: 'Test mail Message-ID list (803/804)', status: 'PASS',
    evidence: '`docs/TEST-MAILS.md` me **43 test rows** (id, account, folder, uid, subject, Message-ID) — sab 803/804 me hain. Koi delete nahi kiya. Owner ijazat ke bagair koi cleanup nahi.',
    next: 'Aap delete ki ijazat dein to sirf in 43 Message-IDs par scoped cleanup.',
  },
  {
    id: 5, title: 'Network + LVM report (kuch nahi badla)', status: 'PASS',
    evidence: 'Active interface **wlp4s0 (Wi-Fi, UP/DORMANT)**; Ethernet `enp0s31f6` DOWN. `iw dev wlp4s0 get power_save` → NA (tool unavailable) — power-save status **NOT TESTED**. Disks: nvme0n1 238.5G; p1 1G EFI, p2 2G boot, p3 235.4G LVM. VG `ubuntu-vg` size 235.42g **free 135.42g**; LV `/` 100G ext4. Koi change nahi kiya.',
    next: 'Agar Wi-Fi power-save sakhti se dekhna ho to `iw` install karna padega — abhi nahi.',
  },
  {
    id: 6, title: 'Kernel/package updates + reboot flag', status: 'PASS',
    evidence: '`/var/run/reboot-required` → **"*** System restart required ***"**. `apt list --upgradable` → **23 packages**: libasound2-data, libasound2, libdav1d5, libdw1, libelf1, libgssapi-krb5-2, libk5crypto3, libkrb5-3, libkrb5support0, libpcap0.8, libpq-dev, libpq5, libtiff-dev, libtiff-tools, libtiff5-dev, libtiff5, libtiffxx5, php8.3, postgresql-18-jit, postgresql-18, postgresql-client-18, postgresql-client-common, postgresql-common. Reboot **abhi nahi** — Gate 1 ke saath.',
    next: 'Gate 1 reboot window me upgrades + reboot + SSO/health smoke.',
  },
  {
    id: 7, title: 'Handoff doc', status: 'PASS',
    evidence: '`docs/HANDOFF.md` likha gaya: current state, fixes timeline, pending owner/deadline table, key paths/scripts, 5 operating rules (no user-data delete, no unscoped token delete, tests via run-tests.sh, no sync before inventory, post-rotation restart+SSO smoke). Koi secret nahi.',
    next: 'Context compact hone par pehle HANDOFF.md padhein.',
  },
]

export default function QaAudit11() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 11' }]} />
      <PageHeader title="Q&A AUDIT 11" subtitle="Numbers reconcile · bodies backup/heal · large-mail limitation · handoff · koi secret nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <strong>6 PASS · 1 FAIL (Q3 large-mail path).</strong> Q3 ko code-padkar PASS nahi likha — 9 MiB BODY[] par daemon EOF aur UI test nahi hua.
          </div>
          <div className="space-y-3">
            {ITEMS.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-surface/40 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone={item.status === 'PASS' ? 'success' : 'danger'}>{item.status}</Badge>
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
