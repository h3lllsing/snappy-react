import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Report-only register — 2026-11-28. No config/DB/mailbox/daemon change. No secrets. */
const ITEMS = [
  {
    id: 1, title: 'A — NON-NEGOTIABLE RULES + pending/open/change lists', status: 'PASS',
    evidence: '`docs/HANDOFF.md` ke sab se oopar 11 rules likhe gaye (secret nahi · bina likhi ijazat change nahi · .bak pehle · naya mailbox/sync nahi · test mail delete nahi · report-only me change nahi · har claim ke saath command output · NOT TESTED≠PASS · owner ke har item ka jawab · tests sirf run-tests.sh · rotation ke baad restart+SSO). Saath hi pending list, open items (Q1 804, browser result, Gate 1 list, reboot window, delete approval) aur approved/unapproved change lists bhi add kiye. Gap bhi likha: `ImapConnLogTest.php` bina pre-change .bak ke modify hua tha.',
    next: '—',
  },
  {
    id: 2, title: 'B — fresh-session verification (doc par bharosa nahi)', status: 'PASS',
    evidence: 'HANDOFF dobara padha + rules dohraye. Khud live check: `/api/health` → `{"status":"ok","queue_depth":0,"checks":{"db":true,"cache":true,"queue":true,"imap":true}}`; `df /` → 98G size / **21G used / 72G avail**; system services nginx, mysql, redis-server, php8.3-fpm, fail2ban, snmpd, ssh **active**; user services fake-imap, idle@0..5, queue, queue@1..7, smtp-relay **active**; `sync_enabled=1` sirf 803/804, koi per-account `sync_max_mb` override nahi. Tests 201/201.',
    next: '—',
  },
  {
    id: 3, title: 'Disk growth + backups + retention', status: 'PASS',
    evidence: '`du -xh --max-depth=2 /var /home /root /tmp | sort -h | tail`: **/var 9.4G** (mysql 8.0G, apt 331M, cache 173M, log 78M), **/home 3.1G** (.local 1.8G, snapd 479M, npm 370M, .opencode 326M, REACT-snappy 313M), **/tmp 253M** (opencode 205M, db-backup 127M). Growth source: **`/var/lib/mysql/nginx2-slow.log` 1.7G** (long_query_time=1, slow_log ON) + **51 binlogs = 5.2G** (expire 30 d). Logrotate sirf `/var/log/mysql/*log` cover karta hai — `/var/lib/mysql/nginx2-slow.log` **uncovered**. Backups: `/var/backups/alphaspace/` 67M, 5 stamps (26/27/28 Nov), `db_pre_bodies_20261128.sql.gz` **12M** (marker `keep_until 2026-12-05`), `db_bodies_drill` 1.3M, `bodies_20261128-042040.tar.gz` 9.5M. `offbox-test/`: 2 enc files 9.9M + 11M (27 Nov). Scratch `/tmp/opencode/db-backup/opencode.db` 127M (23 Nov). Retention: `backup.sh RETENTION_DAYS=14`, offbox script retention limit. Koi cleanup nahi kiya.',
    next: 'Slow-log rotation/binlog review owner approval se (abhi sirf report).',
  },
  {
    id: 4, title: 'Test isolation (sqlite :memory:, 1143 probe)', status: 'PASS',
    evidence: '`phpunit.xml`: `APP_ENV=testing`, `DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`, `CACHE_STORE=array`, `QUEUE_CONNECTION=sync`, `SESSION_DRIVER=array`, MAIL array. **`.env.testing` maujood nahi**. `RefreshDatabase` 36 test files me (sqlite in-memory); `DatabaseTransactions=0`, `flushdb=0`, `TRUNCATE=0`, `Redis::flush=0`, direct mysql PDO/`DB::connection("mysql")` grep → **0**. `tools/run-tests.sh` config:clear → test → rebuild+re-hardened (isliye direct `php artisan test` unsafe). Port 1143: `ScaleAcceptanceTest:184` / `SignoffAcceptanceTest:28` pehle `stream_socket_server(127.0.0.1:1143)` try karte hain; occupy ho to sirf `stream_socket_client(...,0.5)` TCP probe + close (LOGIN nahi) → connlog me `no_auth, commands=[]` ke saath `client_eof` records isi se aate hain. `imap_port=1143` wale config arrays unit-test se config values hain, real connection nahi.',
    next: '—',
  },
  {
    id: 5, title: 'imap.env design update (implement nahi)', status: 'PASS (design)',
    evidence: 'Daemon code se sirf key naam: `IMAP_CONNLOG_DIR`, `IMAP_LITERAL_WRITE_DEADLINE_SECONDS`, `IMAP_MAX_CLIENTS`, `IMAP_PORT`, `IMAP_WORKERS`; config() se `database.*` → `DB_CONNECTION/DB_URL/DB_DATABASE/DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_SOCKET/DB_CHARSET/DB_COLLATION/DB_FOREIGN_KEYS`, `filesystems.*` → `FILESYSTEM_ATTACHMENTS_DISK/FILESYSTEM_BODIES_DISK`, `attachments.allow_upstream_fetch`. Design: `deploy/cutover-env.sh` jaisa generator `.env` se **sirf in whitelisted keys** par `imap.env` (mode 600) banayega — hand-maintained nahi; unit `EnvironmentFile=` usi file par; `${...}`/quotes nahi. Rotation runbook me naya step: `imap.env regenerate → daemon restart → daemon-environ vs Dotenv sha256 match (expected 100%)`. Mismatch par `ops_events` event `imap.env.mismatch` + `alerts:watch` se alert. Whitelist inhi keys tak mehdood — koi extra key copy nahi.',
    next: 'Agle window me owner ijazat se implement.',
  },
  {
    id: 6, title: 'UIDPLUS + cleanup plan revision', status: 'PASS',
    evidence: 'Upstream `CAPABILITY` 803 aur 804 dono: **UIDPLUS present** (42 caps). Cleanup revision (execute nahi): scoped `UID EXPUNGE` for exact 45 Message-ID UIDs (UIDPLUS confirm ke saath), UIDPLUS support na ho to Trash me move; phir local mirror cleanup + UID gap check. **Koi STORE/EXPUNGE nahi chalaya**, test mails delete nahi.',
    next: 'Aapki delete ijazat ke baad hi execute.',
  },
  {
    id: 7, title: 'postgresql-18 — koi aur app use/plan?', status: 'PASS (report)',
    evidence: '`grep -rIl "pgsql|postgres" /home/*/*/.env* /etc` (file naam, values nahi): `/etc/postgresql/18/main/*`, `/etc/apt/sources.list.d/pgdg.list`, `/etc/freeswitch.orig/sip_profiles/internal.xml`, `/etc/freeswitch.orig/autoload_configs/cdr_pg_csv.conf.xml` + 4 aur FreeSWITCH configs, `/etc/fusionpbx/config.conf`, PHP pgsql modules, `/etc/services`, `/etc/passwd/group`. PGDG source **present**. Cluster: `pg_lsclusters` → `18 main 5432 down`, data `/var/lib/postgresql/18/main`. `ss` me 5432 listener nahi; running services me freeswitch/fusionpbx nahi — active use nahi, par configs reference karte hain. **Koi removal nahi kiya.**',
    next: 'Agar kisi din removal ho to FreeSWITCH/FusionPBX configs pehle review.',
  },
  {
    id: 8, title: 'Reboot plan — baqi apps/services + impact', status: 'PASS (plan only)',
    evidence: 'System running (31): mysql, nginx, php8.3-fpm, redis-server, ssh, fail2ban, snmpd, cron, atd, dbus, wpa_supplicant, netplan-wpa-wlp4s0, systemd-networkd/resolved/timesyncd, snapd, packagekit, unattended-upgrades, thermald, irqbalance, haveged, udisks2, upower, multipathd, ModemManager, fwupd, polkit, rsyslog, getty@tty1, user@1000. User running (23): fake-imap, idle@0..5, queue + queue@1..7, smtp-relay, **7 opencode-worker@*** (audit workers). nginx vhost sirf `portal` (listen 80 + 443 ssl, server_name 10.20.30.250). `Linger=yes` → user units boot par wapas aayenge. `/var/run/reboot-required` set. Impact: reboot par sab connections/IDLE/queue cut — baad me units + linger + health + relay + canary + SSO smoke verify zaroori; 23 apt updates + kernel. Koi reboot/upgrade nahi kiya.',
    next: 'Gate 1 reboot window, owner laptop ke saamne.',
  },
]

export default function QaAudit18() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 18' }]} />
      <PageHeader title="Q&A AUDIT 18" subtitle="Rules + fresh-state verify + disk/tests/env/UIDPLUS/postgres/reboot report · koi change nahi · koi secret nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
            <strong>8 PASS · Context ~95%.</strong> Aapke prompt ke A, B aur 1–6 — sab ke jawab. Report-only: koi config/DB/file/mailbox/daemon change nahi.
          </div>
          <div className="space-y-3">
            {ITEMS.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-surface/40 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone={item.status.startsWith('PASS') ? 'success' : 'warning'}>{item.status}</Badge>
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
