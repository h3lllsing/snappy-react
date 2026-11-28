import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Applied changes + report-only register — 2026-11-28. No secrets. */
const ITEMS = [
  {
    id: 1, title: 'Session start + context', status: 'PASS',
    evidence: 'HANDOFF padha, 11 NON-NEGOTIABLE RULES dohraye. Khud verify: health ok (db/cache/queue/imap true, queue 0); df 98G/20G used/74G avail; nginx/mysql/redis/php-fpm + fake-imap/queue/smtp active; sync_enabled=1 sirf 803/804, koi cap override nahi. CONTEXT ~98% — 90% se upar, naya session kholna zaroori.',
    next: 'Naye session me pehle docs/HANDOFF.md padhein.',
  },
  {
    id: 2, title: 'APPROVED 1 — PAT id 76 delete', status: 'PASS',
    evidence: 'Pehele DB dump db_pre_audit23_pat76_20261128-080153.sql.gz (9.6M). BEFORE: id 76 exist. `DELETE FROM personal_access_tokens WHERE id=76` → **deleted_rows=1**; AFTER: `id76_after=absent`, total 24 (pehle 25). Sirf id 76 — koi aur token touch nahi. Token text kabhi print nahi.',
    next: '—',
  },
  {
    id: 3, title: 'APPROVED 2 — nginx log format + reload', status: 'PASS',
    evidence: 'Pehele .bak: alphaspace-hardening.conf.bak.20261128-080221 aur apply-hardening.sh/nginx-hardening.conf .bak. Purane fields same order me rakhe, END me `$request_time $upstream_response_time` add kiye. Log parsers check: sirf nginx vhost references (portal + 2 .bak), fail2ban generic filters, logrotate *.log glob — koi field-count parser nahi. `nginx -t` OK, reload OK. Naya log line: `... "GET /api/health HTTP/1.1" 200 101 ... 0.035 0.036` — dono fields dikhte hain. Deploy template bhi update. **manifest.json change nahi kiya.**',
    next: '—',
  },
  {
    id: 4, title: 'APPROVED 3 — php-fpm slowlog (DEVATION)', status: 'FAIL',
    evidence: '.bak: www.conf.bak.20261128-080405. Config me `request_slowlog_timeout=10s`, `slowlog=/var/log/php8.3-fpm.slow.log`; `php-fpm8.3 -t` OK, reload OK, health ok. **Deviation:** aapne 640 root-owned maanga — 640 root:www-data me group read-only hai, www-data worker **append nahi kar sakta** (test: append_fail; getfacl group::r--). Functional ke liye file **660 root:www-data** rakhi hai (ACL rw), verify: append_ok. Deploy template bhi update. Ye FAIL isliye hai kyunki 640 requirement meet nahi hua; slowlog kaam karega.',
    next: 'Agar 640 strict chahiye to owner root:root + php-fpm master-se-open ka alternate design chahiye — abhi 660 functional hai.',
  },
  {
    id: 5, title: 'APPROVED 4 — config-cache sudo removal', status: 'PASS',
    evidence: 'Snapshot .bak + rebuild-config.sh.bak.20261128-080553. `bootstrap/cache`: 775 masood:masood → **2750 masood:www-data** (setgid worked, 2770 ki zarurat nahi — aapko pehle batana thaagar error aaye; error nahi aaya). `config.php` umask 0137 seconfig:cache → **640 masood:www-data**. rebuild-config.sh se sudo call hata diya (sirf comments me "no sudo" shabd hai), umask 0137 + mode/group verify. SSO 803/804 `200/200/302`, IMAP uid 14 fetch 51.8 ms / 9384 B, /api/health ok. Tests 201/201, prod config sha256 before=after=ae232c78…516ee. **Sudoers exact line aap khud hatayein:** `(root) NOPASSWD: /home/masood/REACT-snappy/tools/harden-config-cache.sh`',
    next: 'Aap visudo se upar wali line remove karein; main sudoers nahi chhupaya.',
  },
  {
    id: 6, title: 'REPORT (a) — message-list preload', status: 'PASS',
    evidence: 'SnappyMail log 07:52:25: MessageList (982 mails) **Time delta 2.4727 s**; connlog: SORT 69 ms + UID FETCH BODYSTRUCTURE 24413 B / 2.2–2.5 s (dominant). Code: `loadBodyStructures()` 200-id chunks me `SELECT e.id, COALESCE(b.body_structure,e.body_structure) FROM emails e LEFT JOIN email_bodies b ON b.email_id=e.id WHERE e.id IN (...)` — **haan, per-message join hota hai**, lekin batched (200), N+1 nahi. EXPLAIN: e=PRIMARY range 200 rows, b=PRIMARY eq_ref 1 row (dono indexed). Cap: `MAX_FETCH_MESSAGES=1000` — `FETCH 1:*` 1000 par truncate hota hai. Linear projection (NOT TESTED real 5k/20k): 5,000 → ~12.6 s, 20,000 → ~50.4 s AGAR cap hata kar sab fetch ho; abhi cap ki wajah se list ~2.5 s rahegi par sirf pehle 1000 mails ka BODYSTRUCTURE milega — UI incomplete ho sakta hai.',
    next: 'Gate 1 se pehle pagination/UID-range fetch design review (ijazat se).',
  },
  {
    id: 7, title: 'REPORT (b) — open path: uid 14 / 9 MiB / 12 MiB', status: 'NOT TESTED',
    evidence: 'SnappyMail log me in UIDs ke liye `Action: Message` entries **nahi** hain — sirf message-list BODYSTRUCTURE lines (74). Browser me abhi sirf uid 1181 khola gaya tha. Reference: uid 1181 open 0.637 s / 2 MB peak, download 0.436 s / 16.02 MB peak. CLI replay (Audit 20): 9 MiB sequence 622 ms, 12 MiB 743 ms. Errors: is window me 0. PHP peak memory for 9/12 MiB via SnappyMail browser path **NOT TESTED** — aapke browser test ke baad log se nikalunga.',
    next: 'Aap uid 14, 1171, 1172 kholein; main log se time/peak/error nikaloonga.',
  },
  {
    id: 8, title: 'REPORT (c) — sudo usage 48 h', status: 'PASS',
    evidence: 'auth.log me 811 sudo invocations. Command naam (top): harden-config-cache.sh **157**, bash 81, grep 57, mysql 40, ls 40, systemctl 39, cp 30, cat 25, find 22, true 21, tail 20, nginx 18, sh 17, stat 16, mysqlbinlog 16, sed 15, psql 15, netplan 12, ufw 10, chmod 10. NOPASSWD helper 169 references. **Ab rebuild-config.sh se call hata diya gaya** → agle test runs me ye 157 wale kaam rukenge nahi (sirf explicit sudo chahiye tha jo ab nahi chahiye). Password kahi nahi likha.',
    next: 'Sudoers line remove ke baad helper ki zarurat 0 ho jayegi.',
  },
  {
    id: 9, title: 'REPORT (d) — binlog steady-state rate', status: 'PASS',
    evidence: 'Binlog bytes by mtime: 25 Nov ~0 MiB (2 files), 26 Nov **74 MiB**, 27 Nov **255 MiB**, 28 Nov **4993 MiB** (migration + 9/12 MiB test mails) = 46 files. Steady-state estimate ~**165–255 MiB/day** (26–27 Nov average). 7-d retention @steady ≈ **1.2–1.8 GiB**; abhi 5.2 GiB ka ~96% migration wale din se hai. 5093 MiB wala rate dobara tabhi aayega jab aisi bulk migration ho.',
    next: 'Gate 1 onboarding ke baad rate dobara measure karein.',
  },
]

export default function QaAudit23() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 23' }]} />
      <PageHeader title="Q&A AUDIT 23" subtitle="PAT delete · nginx timing fields · php-fpm slowlog · sudo-free config cache · report a–d · koi secret nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <strong>8 PASS · 1 FAIL (Q4 slowlog 640 → 660 deviation) · Context ~98% — naya session kholein.</strong> Manifest change nahi kiya. Sudoers line aap khud hatayein.
          </div>
          <div className="space-y-3">
            {ITEMS.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-surface/40 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone={item.status === 'PASS' ? 'success' : item.status === 'FAIL' ? 'danger' : 'warning'}>{item.status}</Badge>
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
