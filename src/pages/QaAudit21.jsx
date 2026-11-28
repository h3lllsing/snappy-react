import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Approved lock + design-only + report-only register — 2026-11-28. No secrets. */
const ITEMS = [
  {
    id: 1, title: 'Session start + context notice', status: 'PASS',
    evidence: 'HANDOFF padha, 11 NON-NEGOTIABLE RULES dohraye. Khud verify: health ok (db/cache/queue/imap true, queue 0); df 98G/20G used/74G avail (slow-log rotate se ~1.7G wapas mila); nginx/mysql/redis/php-fpm + fake-imap/queue/smtp active; sync_enabled=1 sirf 803/804. CONTEXT ~97% — 90% se upar hai, naya session kholne ki salah diya gaya hai.',
    next: 'Naye session me pehle docs/HANDOFF.md padhein.',
  },
  {
    id: 2, title: 'APPROVED 1 — history dirs locked (700/600)', status: 'PASS',
    evidence: 'Pehele timestamped mode-snapshot .bak: history-modes-before-20261128-074906.bak. BEFORE: teeno dirs 775 masood:masood. AFTER: ~/.opencode, ~/.local/share/opencode, /tmp/opencode sab **700 masood:masood**; regular files 600 (opencode.db 600, a-verify.py 600, bin/opencode 700 owner-exec). Ek root-owned file /tmp/opencode/bodies-drill.tsv (0:0 644) sudo se 600 kiya. node_modules/.bin symlinks ka 777 Linux me cosmetic hai (symlink mode ignored, targets go-rwx kiye). Caveat: harness har shell ke liye naya .out file 664 banata hai — parent dir 700 hone se group/other access blocked. Workers: pending 0, running 0, done 192, failed 0. Health OK.',
    next: 'Naye session me .out files dobara 600 karna padega agar strict chahiye.',
  },
  {
    id: 3, title: 'APPROVED 2 — config-cache sudo hatao: DESIGN ONLY', status: 'PASS (design)',
    evidence: 'Current: bootstrap/cache 775 masood:masood, config.php 640 masood:www-data; rebuild-config.sh abhi sudo -n harden-config-cache.sh call karta hai. Scratch test (production untouched): setgid dir 2770 masood:www-data + umask 027 → file **750** masood:www-data (KYUN: Laravel 13 Filesystem::replace() line 232 chmod(0777 - umask()) karta hai, bitwise nahi). umask **0137** → file **640 masood:www-data** (test me verify). Design: (1) sudo chgrp www-data bootstrap/cache && sudo chmod 2770 bootstrap/cache; (2) rebuild-config.sh me sudo block hatakar umask 0137 se config:cache, phir stat verify 640 + group www-data, mismatch par fail; (3) run-tests.sh ka env -u APP_CONFIG_CACHE wala call rahe. Root-owned /usr/local/sbin helper chahiye to: install -o root -g root -m 0755, symlink reject ([ -L "$p" ] && exit 1), realpath ensure /usr/local/sbin ke andar, group badalne ke liye chgrp -h --no-dereference. APPLY NAHI KIYA; sudoers aap khud visudo se badleinge.',
    next: 'Aapka "apply" likhne par hi commands chalayenge.',
  },
  {
    id: 4, title: 'REPORT (a) — mysqldumpslow top shapes', status: 'PASS',
    evidence: 'zcat nginx2-slow.log.1.gz (2.6M) | mysqldumpslow -s c -t 10: top shapes (literals N/S se normalized): email_bodies INSERT count 17 avg 1.40 s; emails INSERT count 12 avg 1.44 s; email_bodies upsert count 11 avg 3.51 s; emails INSERT variant count 9 avg 1.24 s; emails upsert (raw column ke saath) count 9 avg 2.12 s; SELECT * email_bodies count 4 avg 5.20 s (1033 rows); SELECT * emails count 4 avg 3.26 s (~1000 rows); update emails raw=NULL count 1 avg 1.07 s; backfill anti-join count 1 avg 1.10 s. Ye zyadatar one-time migration + restore-drill ke hain, steady-state nahi. Existing indexes already cover (account,folder,uid), (account,folder,message_id), email_bodies PRIMARY=email_id — naya index propose nahi; 800 mailboxes par asli risk raw column wali upsert (2.12 s avg) aur concurrent sync — batching + worker cap se control karna hota (NOT TESTED). Koi index apply nahi kiya.',
    next: 'Gate 1 ke baad real concurrent load par EXPLAIN + slow-log review.',
  },
  {
    id: 5, title: 'REPORT (b) — binlog options comparison', status: 'PASS (recommendation)',
    evidence: 'Abhi: binlog_expire_logs_seconds=604800 (7 d), 51 files/5.2 G, 24h rate 5193 MiB (~5.07 GiB/d). Replica nahi (SHOW REPLICA STATUS 0 rows, binlog dump threads 0). (i) 7d: ~35 GiB at current rate, PITR 7 d. (ii) 2–3d: ~10–15 GiB, PITR 2–3 d. (iii) binlog_row_image=MINIMAL: UPDATE/DELETE row images chhote — hamare workload me mostly INSERT/upsert, to faucala moderate; PITR 7 d rahe; effect NOT TESTED. (iv) log_bin off: 0 GiB, PITR khatam, recovery sirf dumps se — RPO ~24 h (latest dump 04:20 tha to us waqt ~3 h 20 m); replication koi nahi to wahan nuksan nahi. Recommendation: Gate 1 onboarding ke dauran 7d rakhein; MINIMAL par tabs jab measured benefit ho; log_bin off nahi.',
    next: 'Koi option change nahi kiya — sirf recommendation.',
  },
  {
    id: 6, title: 'REPORT (c) — Gate 1 disk monitoring plan', status: 'PASS (plan)',
    evidence: 'Track karein: /var/lib/mysql (binlog + slow log), /var/backups/alphaspace, storage/app/private/bodies, storage/app/private/attachments, /tmp/opencode. Har mailbox add ke baad: `du -sh` in paths + `df -h /` + emails/email_bodies count aur SUM(size), ek row log me (timestamp, mailbox id, delta bytes). Alert: AlertsWatch::checkDiskSpace() me pehle se `disk.space_low` critical event hai, threshold config/alerts.php `thresholds.disk_percent=80` — 80% alert Q7 ke baad enable/verify karna hai (abhi naya config nahi). Escalation: 70% warning, 80% critical, 90% onboarding pause. Koi monitoring change nahi kiya.',
    next: 'Gate 1 window mehar mailbox ke baad growth row likhein.',
  },
  {
    id: 7, title: 'REPORT (d) — worker disable/enable commands (sirf likho)', status: 'PASS',
    evidence: 'REBOOT SE PEHLE: `systemctl --user disable opencode-worker@be-audit-correctness.service opencode-worker@be-audit-recovery.service opencode-worker@be-audit-reporting.service opencode-worker@be-implementer.service opencode-worker@fe-be-contract.service opencode-worker@nginx-deploy-architect.service opencode-worker@security-auditor.service` phir `systemctl --user stop opencode-worker@*.service` aur `systemctl --user list-units "opencode-worker@*" --state=running` se 0 verify. REBOOT KE BAAD: `systemctl --user enable --now <sab 7>` phir `workers/status.sh`. Linger=yes hai to disable ke bina units boot par wapas aa jaate. Commands nahi chalaye.',
    next: 'Reboot window me owner in commands chalayega.',
  },
]

export default function QaAudit21() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 21' }]} />
      <PageHeader title="Q&A AUDIT 21" subtitle="History lock applied · config-cache sudo design only · mysqldumpslow/binlog/disk/worker report · koi secret nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <strong>7 PASS · Context ~97% — 90% se upar hai, naya session kholein.</strong> Approved 1 apply; Approved 2 sirf design; report-only me koi change nahi.
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
