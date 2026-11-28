import { useState } from 'react'
import { Badge, Button, Card, CardBody, PageHeader, Tabs } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

const CONTENT = {
  en: {
    header: {
      title: 'Portal Workflow Guide',
      subtitle: 'Super-admin reference for the live Alphaspace mail portal.',
      language: 'Language',
      roleBadge: 'Super-admin only',
      jump: 'Jump to runbooks',
      footer: 'Source: docs/SIGNOFF.md and companion audit docs. Super-admin only.',
    },
    sections: [
      {
        id: 'architecture',
        title: 'Architecture / system overview',
        items: [
          'React FE is served as a static Vite `dist`; NGINX listens on 443 at `10.20.30.250` and passes `/api/` and `/webmail/` to PHP-FPM 8.3 over `/run/php/php8.3-fpm.sock` (no `php artisan serve`).',
          'Backend is Laravel 13 (`laravel/framework ^13.17`) with MySQL 8.0.46 (`roundportal`) and Redis 6.0.16 on `127.0.0.1:6379` for cache, queue and sessions.',
          'Real mail is mirrored into the local `emails` table by IMAP sync/IDLE workers; SnappyMail 2.38.2 under `/webmail/` reads that mirror through a per-account fake IMAP daemon on `127.0.0.1:1143`.',
          'The database mirror is the local mail store; the fake IMAP daemon never contacts a real upstream IMAP server. Attachments stay on the `local` disk and are backed up separately.',
          'Sending uses the domain\'s real SMTP host; the webmail UI itself only reads the local mirror.',
        ],
      },
      {
        id: 'setup',
        title: 'Domain & email account setup',
        items: [
          'Domains: use discovery preview `POST /api/domains/discover`, then add the domain with `POST /api/domains`; keep `imap_host` / `smtp_host` stable and use a trusted certificate covering that hostname.',
          'After a domain SMTP change, run `cd /home/masood/REACT-snappy/backend` and `php artisan snappy:generate-domains --check`; IMAP must stay pinned to `127.0.0.1:1143`, and only SMTP comes from the real domain config.',
          'Accounts: add a mailbox with `POST /api/email-accounts`; credentials are encrypted at rest and never returned in responses. Confirm sync with `/api/email-accounts/{id}/sync-status` and IMAP Status.',
          'Create/edit sends password, ports and encryption; `brand_id` is validated and persisted, and `PUT|PATCH /email-accounts/{id}` can rotate the password.',
          'Assignment: use Assign user in account detail or `PATCH /api/email-accounts/{id}/assign/{userId}` (`DELETE ...` to remove); recompute with `POST /api/assignments/recompute`. Every assignee with `can_receive=true` receives new-mail notifications.',
          'Sync flags: IDLE selects only `active` accounts with `sync_enabled=true`; three consecutive failures set `sync_enabled=false` / `sync_status=\'paused\'`, while success clears counters and calls `resumeIfHealthy()`.',
        ],
      },
      {
        id: 'incoming',
        title: 'Incoming mail flow',
        items: [
          'Real IMAP IDLE runs in three systemd shards: `alphaspace-idle@0`, `alphaspace-idle@1` and `alphaspace-idle@2`; IMAP Status emits only `status`, `uidnext`, `users` and `last_check`, with statuses `connected`, `reconnecting`, `error`, `paused` and `syncing`, not reconnect-attempt counters.',
          '`SyncAccountEmailsJob` mirrors oldest-first batches with a UID watermark / `UIDVALIDITY` guard and dedupe; runs are recorded in `sync_runs` and dispatched on a 5-minute stagger (`email:sync-accounts`).',
          'On ingest, a notification row is created for every assignee with `can_receive=true`; the FE polls every 2 s.',
          'The fake IMAP daemon only serves the local mirror; its IDLE path uses the Redis `emails_version` change token per `(account,folder)` instead of a 4-second full-folder snapshot.',
          'SnappyMail\'s iframe refreshes instantly in the portal via `postMessage`.',
        ],
      },
      {
        id: 'outgoing',
        title: 'Outgoing mail flow',
        items: [
          'Compose in SnappyMail: the message goes to the loopback SMTP relay `127.0.0.1:2525`; the relay enforces `can_send`, session and RCPT checks, then delivers through DB-driven upstream SMTP using server-side credentials (real mailbox SMTP credentials are never sent to SnappyMail).',
          'After relay acceptance, the local Sent mirror is updated and reverse-push idempotency prevents duplicate downstream delivery; `PushSentEmailsToServerJob::sendSmtp()` remains the server-side delivery path using Eloquent encrypted casts.',
          'Before the relay, SnappyMail direct SMTP was not proven and was effectively broken; only portal-side/server-side push was proven (audit evidence: `webmail_sent_rows=0`, all 8 Sent rows `sent_via_webmail=0`, no `:2525` listener at audit time).',
          'Failures keep unpushed rows at `pushed_to_server_at IS NULL` until settings are corrected and the job is re-dispatched; stale SnappyMail domain SMTP blocks need regeneration after an SMTP host change.',
          'End-to-end verification is pending Gate 1 real E2E testing; UI-level exactly-once is NOT PROVEN until that test passes.',
        ],
      },
      {
        id: 'sso',
        title: 'SSO & iframe',
        items: [
          '`POST /api/email-accounts/{id}/webmail-token` returns a single-use token; the FE posts it to `/webmail/portal-sso.php`, which returns an HTML auto-submit POST form targeting `/webmail/?sso`.',
          'The SSO hash is delivered in the POST body, not in a query string.',
          '`portal-sso.php` consumes the one-time token and uses the stored account/domain rows only.',
          'SnappyMail AppData has `Auth=True` and sets cookies `smsession`, `smctoken` and `smaccount`; there is no login form.',
          'The iframe source is built from the local mirror and refreshes via `postMessage`.',
        ],
      },
      {
        id: 'audit',
        title: 'User-action audit',
        items: [
          'The `portal-audit` SnappyMail plugin hooks user actions and calls `POST /api/webmail/activity`, which returns 204.',
          '`actor_id` and `email_account_id` are resolved from the validated webmail session, never from request input.',
          'Rows land in `mailbox_activity` and `ops_events`; Activity Logs shows causer, description, subject and time, while Mail Activity shows actor, action, mailbox, subject and timestamp.',
          'Write path is `POST /api/webmail/activity`; read path is `GET /api/webmail/activity-log` (Mail Activity) while Activity Logs uses `GET /api/activity-logs`. Ops correlations are stored in the `ops_events` table.',
          'A manual actor row was verified at the DB/API level; no browser screenshot was retained.',
        ],
      },
      {
        id: 'notifications',
        title: 'Notifications',
        items: [
          'On ingest, a notification row is created for every assignee; the documented rule is every assignee with `can_receive=true`.',
          'The FE polls `GET /notifications/poll` every 2 s; the live throttle is `throttle:6000,1` (per minute).',
          'The live browser toast was verified at the DB/API level; a visual capture was not retained, and this is an accepted residual in the sign-off.',
          'The SPA bearer token has a 480-minute TTL and is stored in `sessionStorage`, not an httpOnly cookie.',
          '`/api/ops/stream` is cursor-based; MailActivity uses a keyset cursor (`occurred_at,id`) with no offset, while Search filters client-side arrays.',
        ],
      },
      {
        id: 'ops',
        title: 'Ops Console & error reporting',
        items: [
          'The Ops Console reads `/api/ops/summary`, `/api/ops/sync-runs`, `/api/ops/issues`, `/api/ops/mail` and `/api/ops/stream` (cursor); the FE does not consume an events endpoint, correlations stay in `ops_events`.',
          'Health is `/api/health` with `checks.db/cache/queue/imap` and `queue_depth`.',
          'FE `window.onerror`, `unhandledrejection` and the axios interceptor report to `POST /api/ops/errors` (HTTP 5xx/405/404).',
          'PHP `$exceptions->reportable(...)` feeds `RecordExceptionJob`, which upserts `issues` and inserts `ops_events`, deduplicated by correlation and a Redis rate limit on unique `issues.correlation_id`.',
          'Ops retention: `sync_runs` 7d, `issues` 30d, `metrics` 30d and `operator_actions` 90d; `LOG_STACK=single` and `LOG_LEVEL=warning`.',
          'Credentials are sanitized from responses and must never appear in logs, queue payloads or tickets.',
        ],
      },
      {
        id: 'admin-menu',
        title: 'Administration menu guide',
        items: [
          'Live Operations — Ops Console endpoints `/api/ops/*` plus `/api/health` checks and queue depth.',
          'IMAP Status — `/admin/imap-status` polls every 30 s and emits `status`, `uidnext`, `users` and `last_check` (`connected`, `reconnecting`, `error`, `paused`, `syncing`), not reconnect-attempt counts.',
          'Activity Logs — `/activity-logs` reads `GET /api/activity-logs` and shows causer, description, subject and time.',
          'Mail Activity — actor-correct rows from `mailbox_activity` and `ops_events`, including the Mail Activity page.',
          'Login History — `login_audits` records such as `login_success` with IP and timestamp.',
          'Queue Monitor — Redis queue workers (`alphaspace-queue*`), `queue_depth` in `/api/health` and daily `queue:prune-failed`.',
          'Brands/Teams — domain create makes a matching brand and `brand_id` is validated and persisted on account create.',
          'Domains — discovery preview, `POST /api/domains`, stable hosts and `php artisan snappy:generate-domains --check` after SMTP changes.',
          'Email Accounts — `POST /api/email-accounts`, encrypted credentials, `/sync-status`, assignment and the Recheck button.',
          'Users — assign/revoke users, `POST /api/assignments/recompute` and per-user first-login rotation at `/change-password`.',
          'Search — filters users, accounts, domains and brands client-side over loaded arrays; only MailActivity uses a keyset cursor (`occurred_at,id`) and no offset.',
        ],
      },
      {
        id: 'brands-teams-users',
        title: 'Brands, Teams & User Management',
        groups: [
          {
            title: 'Brands & Access Matrix (/brands)',
            items: [
              '`brands` table fields: `domain`, `name`, `status`, `lead_id`, `team_id`, `created_by`.',
              'Purpose: access policy per domain following the chain `domain → team lead → team → mailboxes`.',
              'Auto-assign preview calls `POST /api/email-accounts/auto-assign-preview` and shows which users would receive access, from real backend data.',
              'Current state depends on live data; use `/brands` to confirm configured leads and teams for each domain.',
            ],
          },
          {
            title: 'Teams (/teams)',
            items: [
              '`teams` table fields: `name`, `brand_id`, `lead_id`; members are stored in the `team_user` pivot (`role=member`, `added_by`).',
              'Creating a team requires `brand_id` and `lead_id`.',
              'Member add/remove is wired to `POST /api/teams/{id}/members` and `DELETE /api/teams/{id}/members/{userId}`.',
              'Known limitation: the FE lead dropdown lists only users with role `team-lead`; with only a super-admin present, a team cannot be created from the UI until a `team-lead` user exists.',
            ],
          },
          {
            title: 'Team Overview (/team-overview)',
            items: [
              'Read-only aggregated view of teams, members and assigned mailboxes.',
              'Route access is `super-admin`/`admin`/`team-lead` only; `role=user` cannot reach it. Admins see all teams and team leads see their own.',
              'Known limitation: member identities are still derived from user fields (`lead_id`/`team_id`) rather than the `team_user` pivot, so the displayed member list can be inaccurate even when pivot rows exist.',
            ],
          },
          {
            title: 'User Management (/users)',
            items: [
              'Roles: `super-admin` (everything), `admin` (operations), `team-lead` (own team), `user` (only assigned mailboxes).',
              'Actions: create user (`name`/`email`/`password`/`role`), edit `name`/`email`/`role`, suspend, unsuspend, soft delete (Trash), restore and force delete; no bulk UI is provided.',
              'Mailbox assignment happens on the Accounts page via `email_account_user` with `can_send` and `can_receive` flags.',
              'Current mailbox assignments and notification recipients depend on live `email_account_user` data; verify in Accounts/Users before assuming who receives notifications.',
            ],
          },
          {
            title: 'Recommended setup order',
            numbered: true,
            items: [
              'Create a user with role `team-lead` in `/users`.',
              'Set that lead on the target brand in `/brands` (or create a new brand).',
              'Create a team under the brand in `/teams` and add members.',
              'Assign mailboxes to those members on the Accounts page with `can_receive=1`.',
              'Verify in `/team-overview`, keeping its member-derivation limitation in mind.',
            ],
          },
        ],
      },
      {
        id: 'server-move',
        title: 'Mail-server move handling',
        items: [
          'Keep the hostname stable and fix DNS/certificate first; never disable certificate validation (`/novalidate-cert`, `IMAP_VALIDATE_CERT=false`, `IMAP_IDLE_VERIFY_PEER=false` and encryption `none` are prohibited).',
          'Run the alert-only check `php artisan mail:check-server-moves` (weekly; reports `checked`/`detected`/`skipped`/`failed` and changes no account row).',
          'Use the affected mailbox\'s Recheck button (`POST /api/email-accounts/{id}/rediscover`); it probes with stored credentials, adopts working settings and clears an auto-paused state.',
          'Three consecutive failures auto-pause the account (`sync_enabled=false`, `sync_status=\'paused\'`); success clears counters and calls `resumeIfHealthy()`, but scheduled sync/IDLE do not probe a paused account, so Recheck or operator re-enable is the reliable apply path.',
          'After an SMTP change, regenerate SnappyMail domain configs and re-dispatch reverse push for rows still showing `pushed_to_server_at IS NULL`.',
          'Full procedure: `docs/runbooks/mail-server-move.md`.',
        ],
      },
      {
        id: 'retention',
        title: 'Attachments & retention',
        items: [
          'Attachments are content-addressed on the `local` disk (`FILESYSTEM_ATTACHMENTS_DISK=local`) with `content_hash` and a shared-blob refcount; deleting one row never unlinks a file still referenced.',
          '`attachments:gc` runs daily to remove orphaned blobs; dedupe and orphan-GC tests passed.',
          '`mail:prune --days=3650` (default `MAIL_PRUNE_DAYS`) keeps mail locally.',
          '`ops:prune-retention` cleans ops data: `sync_runs` 7d, `issues` 30d, `metrics` 30d and `operator_actions` 90d.',
          'Attachments are backed up separately; `deploy/backup.sh` also copies generated domain configs.',
        ],
      },
      {
        id: 'services',
        title: 'Services & schedules',
        items: [
          'The backend is served by NGINX `fastcgi_pass` to PHP-FPM 8.3 on `/run/php/php8.3-fpm.sock`, not `php artisan serve`.',
          'Queue workers (`alphaspace-queue*`), the fake IMAP daemon, three IDLE shards (`alphaspace-idle@0`, `@1`, `@2`) and the scheduler are systemd-managed; no Horizon dashboard or auto-scaling is installed.',
          '`email:sync-accounts` dispatches every 5 minutes with a staggered delay; `email:reconcile-stuck` also runs every 5 minutes.',
          'Daily schedules: `queue:prune-failed`, `ops:prune-retention`, `attachments:gc` and `mail:prune`.',
          'Weekly schedule: `mail:check-server-moves` (alert-only).',
          'Restart order after a restore: Redis/MySQL → web backend → scheduler → queue workers → IDLE shards → fake IMAP.',
        ],
      },
      {
        id: 'backup',
        title: 'Backup & restore',
        items: [
          'Dump: `mysqldump --defaults-extra-file=/etc/alphaspace/mysql-client.cnf --single-transaction --quick --routines --triggers --events roundportal | gzip > /var/backups/alphaspace/db_$(date +%F).sql.gz`, then an `.ok` marker.',
          'Drill: restore into scratch `roundportal_restore`, compare `users` / `domains` / `email_accounts` / `emails` / `sync_runs` counts, then drop the scratch DB. The PASS dump is `/home/masood/REACT-snappy/backups/mysql-drill-20261125-201849.sql.gz`.',
          'The named pre-cutover path `/var/backups/alphaspace/database.sqlite.pre-cutover` is absent; the actual snapshot is `/home/masood/REACT-snappy/backups/pre-cutover-20261125-183335/` with `code-docs.tar.gz` and `env.backup`. Old SQLite DB data was deleted, so it is not a data rollback point.',
          'Real restore: stop queue workers, all `alphaspace-idle@*` shards, fake IMAP, scheduler and web first, then `zcat /var/backups/alphaspace/db_<YYYY-MM-DD>.sql.gz | mysql --defaults-extra-file=/etc/alphaspace/mysql-client.cnf roundportal`.',
          'Env restore: `cp -p .env.sqlite-backup.<YYYYMMDDHHMMSS> .env` if present, otherwise use `env.backup` from the pre-cutover snapshot; then `php artisan config:clear && php artisan config:cache && php artisan config:show database.default`. Never rotate `APP_KEY` during restore.',
        ],
      },
      {
        id: 'limitations',
        title: 'Known limitations / accepted risks',
        items: [
          'Self-signed TLS for `10.20.30.250`: the certificate has IP + DNS SANs, but clients must trust the internal/self-signed CA; no public-CA trust is available for the bare IP.',
          '`APP_KEY` was deliberately not rotated so existing encrypted mailbox credentials remain decryptable; legacy git history was not purged.',
          'High-volume mirror contention tests were run on seeded data with a dummy upstream; real-IMAP load, provider rate limits and large concurrent browser sessions remain unproven.',
          'Horizon is not installed; queue workers are managed by systemd units (`alphaspace-queue*`, `alphaspace-idle@*`) and `/api/health`.',
          'SMTP-only move recovery is best-effort: automatic recovery triggers on IMAP failure, the weekly check is alert-only, and Recheck is the reliable apply path; unpushed rows stay `pushed_to_server_at IS NULL` until corrected and re-dispatched.',
          'Live config verified 2026-11-26: backend `.env` uses `APP_ENV=production`, `APP_DEBUG=false` and `LOG_STACK=single`.',
          'Accepted risk: the SPA bearer token (480-minute TTL) is kept in `sessionStorage`, so successful XSS can read it; it is not an httpOnly cookie. SnappyMail cookies are separate from SPA auth.',
        ],
      },
      {
        id: 'runbook-index',
        title: 'Runbook index',
        items: [
          '`docs/runbooks/cache-down.md` — Diagnose and recover Redis/cache outages affecting throttles, SSO tokens and unique queue locks.',
          '`docs/runbooks/db-lock.md` — Reduce writers and clear database lock / write saturation on SQLite or MySQL.',
          '`docs/runbooks/server-move.md` — Correct stale domain host settings after upstream server move / auto-discovery drift.',
          '`docs/runbooks/mail-server-move.md` — Alert-only DNS/TLS drift check and the controlled Recheck path for mail-server moves.',
          '`docs/runbooks/smtp-failure.md` — Triage failed reverse-push/Sent copies and store SMTP credentials without leaving them in logs.',
          '`docs/runbooks/token-failure.md` — Diagnose single-use webmail SSO token failures, clock skew and throttling.',
          '`docs/runbooks/idle-storm.md` — Stop and stagger IDLE shards when reconnect attempts and duplicate dispatches spike.',
          '`docs/runbooks/cert-expiry.md` — Renew/validate the NGINX TLS certificate and reload without dropping the listener.',
        ],
      },
    ],
  },

  roman: {
    header: {
      title: 'Portal Workflow Guide',
      subtitle: 'Live Alphaspace mail portal ke liye super-admin reference.',
      language: 'Zabaan',
      roleBadge: 'Sirf super-admin',
      jump: 'Runbooks par jayein',
      footer: 'Source: docs/SIGNOFF.md and companion audit docs. Super-admin only.',
    },
    sections: [
      {
        id: 'architecture',
        title: 'Architecture / system overview',
        items: [
          'React FE static Vite `dist` ke taur par serve hota hai; NGINX `10.20.30.250` par 443 par sunta hai aur `/api/` aur `/webmail/` ko PHP-FPM 8.3 ko `/run/php/php8.3-fpm.sock` ke zariye deta hai (`php artisan serve` nahi).',
          'Backend Laravel 13 (`laravel/framework ^13.17`) hai; MySQL 8.0.46 (`roundportal`) aur Redis 6.0.16 `127.0.0.1:6379` par cache, queue aur sessions ke liye hain.',
          'Asli mail ko IMAP sync/IDLE workers local `emails` table mein mirror karte hain; SnappyMail 2.38.2 `/webmail/` par us mirror ko per-account fake IMAP daemon `127.0.0.1:1143` se padhta hai.',
          'Database mirror hi local mail store hai; fake IMAP daemon kabhi real upstream IMAP server se contact nahi karta. Attachments `local` disk par rehte hain aur alag se backup hote hain.',
          'Bhejne ke liye domain ka asli SMTP host use hota hai; webmail UI khud sirf local mirror padhta hai.',
        ],
      },
      {
        id: 'setup',
        title: 'Domain aur email account setup',
        items: [
          'Domains: discovery preview `POST /api/domains/discover` istemal karein, phir `POST /api/domains` se domain add karein; `imap_host` / `smtp_host` ko stable rakhein aur us hostname ko cover karne wala trusted certificate use karein.',
          'Domain SMTP change ke baad `cd /home/masood/REACT-snappy/backend` chalayein aur `php artisan snappy:generate-domains --check` chalayein; IMAP `127.0.0.1:1143` par pinned rehna chahiye, sirf SMTP real domain config se aata hai.',
          'Accounts: `POST /api/email-accounts` se mailbox add karein; credentials encrypt hoke store hote hain aur responses mein kabhi nahi aate. Sync ko `/api/email-accounts/{id}/sync-status` aur IMAP Status se confirm karein.',
          'Create/edit mein password, ports aur encryption bheje jate hain; `brand_id` validate aur persist hota hai, aur `PUT|PATCH /email-accounts/{id}` se password rotate ho sakta hai.',
          'Assignment: account detail me Assign user, ya `PATCH /api/email-accounts/{id}/assign/{userId}` (`DELETE ...` se hataein); `POST /api/assignments/recompute` se dobara compute karein. Har assignee jiska `can_receive=true` hai, naye mail ki notification paata hai.',
          'Sync flags: IDLE sirf `active` accounts aur `sync_enabled=true` chunta hai; teen consecutive failures par `sync_enabled=false` / `sync_status=\'paused\'` set hote hain, aur success counters clear karke `resumeIfHealthy()` call karta hai.',
        ],
      },
      {
        id: 'incoming',
        title: 'Incoming mail flow',
        items: [
          'Real IMAP IDLE teen systemd shards mein chalta hai: `alphaspace-idle@0`, `alphaspace-idle@1` aur `alphaspace-idle@2`; IMAP Status sirf `status`, `uidnext`, `users` aur `last_check` deta hai, statuses `connected`, `reconnecting`, `error`, `paused` aur `syncing` hote hain; reconnect attempts nahi dikhte.',
          '`SyncAccountEmailsJob` oldest-first batches ko UID watermark / `UIDVALIDITY` guard aur dedupe ke saath mirror karta hai; runs `sync_runs` me record hote hain aur 5-minute stagger (`email:sync-accounts`) par dispatch hote hain.',
          'Ingest par har assignee jiska `can_receive=true` hai, notification row banayi jati hai; FE har 2 s par poll karta hai.',
          'Fake IMAP daemon sirf local mirror serve karta hai; uska IDLE path 4-second full-folder snapshot ki jagah `(account,folder)` ke liye Redis `emails_version` change token istemal karta hai.',
          'SnappyMail ka iframe portal me `postMessage` se foran refresh hota hai.',
        ],
      },
      {
        id: 'outgoing',
        title: 'Outgoing mail flow',
        items: [
          'SnappyMail me compose: message loopback SMTP relay `127.0.0.1:2525` par jata hai; relay `can_send`, session aur RCPT checks lagata hai, phir server-side credentials ke saath DB-driven upstream SMTP se deliver karta hai (asal mailbox SMTP credentials SnappyMail ko kabhi nahi bheje jate).',
          'Relay accept hone ke baad local Sent mirror update hota hai aur reverse-push idempotency downstream duplicate delivery rokti hai; `PushSentEmailsToServerJob::sendSmtp()` server-side delivery path rehta hai jo Eloquent encrypted casts use karta hai.',
          'Relay se pehle SnappyMail direct SMTP proven nahi tha aur effectively broken tha; sirf portal-side/server-side push proven tha (audit evidence: `webmail_sent_rows=0`, sab 8 Sent rows `sent_via_webmail=0`, audit waqt `:2525` listener nahi tha).',
          'Failure par unpushed rows `pushed_to_server_at IS NULL` rehte hain jab tak settings theek karke job dobara dispatch na ho; SMTP host badalne par stale SnappyMail domain SMTP blocks regenerate karne padte hain.',
          'End-to-end verification Gate 1 real E2E test tak pending hai; UI-level exactly-once us test ke pass hone tak NOT PROVEN hai.',
        ],
      },
      {
        id: 'sso',
        title: 'SSO aur iframe',
        items: [
          '`POST /api/email-accounts/{id}/webmail-token` single-use token deta hai; FE usko `/webmail/portal-sso.php` par post karta hai, jo `/webmail/?sso` ko target karne wala HTML auto-submit POST form return karta hai.',
          'SSO hash POST body me aata hai, query string me nahi.',
          '`portal-sso.php` one-time token consume karta hai aur sirf store ki gayi account/domain rows istemal karta hai.',
          'SnappyMail AppData me `Auth=True` hai aur cookies `smsession`, `smctoken` aur `smaccount` set hote hain; koi login form nahi hai.',
          'Iframe source local mirror se banta hai aur `postMessage` se refresh hota hai.',
        ],
      },
      {
        id: 'audit',
        title: 'User-action audit',
        items: [
          '`portal-audit` SnappyMail plugin user actions ko hook karta hai aur `POST /api/webmail/activity` call karta hai, jo 204 return karta hai.',
          '`actor_id` aur `email_account_id` validated webmail session se resolve hote hain, request input se nahi.',
          'Rows `mailbox_activity` aur `ops_events` me jate hain; Activity Logs causer, description, subject aur time dikhata hai, jabke Mail Activity actor, action, mailbox, subject aur timestamp dikhata hai.',
          'Write path `POST /api/webmail/activity` hai; read path `GET /api/webmail/activity-log` (Mail Activity) hai, jabke Activity Logs `GET /api/activity-logs` use karta hai. Ops correlations `ops_events` table me store hote hain.',
          'Ek manual actor row DB/API level par verify hui; browser screenshot retain nahi hua.',
        ],
      },
      {
        id: 'notifications',
        title: 'Notifications',
        items: [
          'Ingest par har assignee ke liye notification row banti hai; documented rule har `can_receive=true` wala assignee hai.',
          'FE har 2 s par `GET /notifications/poll` ko poll karta hai; live throttle `throttle:6000,1` (per minute) hai.',
          'Live browser toast DB/API level par verify hua; visual capture retain nahi hua, aur yeh sign-off me accepted residual hai.',
          'SPA bearer token ki TTL 480 minute hai aur yeh `sessionStorage` me rehta hai, httpOnly cookie me nahi.',
          '`/api/ops/stream` cursor-based hai; MailActivity keyset cursor (`occurred_at,id`) istemal karta hai, offset nahi, aur Search client-side arrays filter karta hai.',
        ],
      },
      {
        id: 'ops',
        title: 'Ops Console aur error reporting',
        items: [
          'Ops Console `/api/ops/summary`, `/api/ops/sync-runs`, `/api/ops/issues`, `/api/ops/mail` aur `/api/ops/stream` (cursor) padhta hai; FE koi events endpoint nahi padhta, correlations `ops_events` me rehte hain.',
          'Health `/api/health` se milti hai, jisme `checks.db/cache/queue/imap` aur `queue_depth` hote hain.',
          'FE `window.onerror`, `unhandledrejection` aur axios interceptor `POST /api/ops/errors` par report karte hain (HTTP 5xx/405/404).',
          'PHP `$exceptions->reportable(...)` `RecordExceptionJob` ko feed karta hai, jo `issues` upsert karta hai aur `ops_events` insert karta hai; correlation aur unique `issues.correlation_id` par Redis rate limit se dedupe hoti hai.',
          'Ops retention: `sync_runs` 7d, `issues` 30d, `metrics` 30d aur `operator_actions` 90d; `LOG_STACK=single` aur `LOG_LEVEL=warning`.',
          'Credentials responses se sanitize hote hain aur logs, queue payloads ya tickets me kabhi nahi aane chahiye.',
        ],
      },
      {
        id: 'admin-menu',
        title: 'Administration menu guide',
        items: [
          'Live Operations — Ops Console endpoints `/api/ops/*` ke saath `/api/health` checks aur queue depth.',
          'IMAP Status — `/admin/imap-status` har 30 s par poll karta hai aur sirf `status`, `uidnext`, `users` aur `last_check` deta hai (`connected`, `reconnecting`, `error`, `paused`, `syncing`); reconnect attempt counts nahi dikhte.',
          'Activity Logs — `/activity-logs` `GET /api/activity-logs` padhta hai aur causer, description, subject aur time dikhata hai.',
          'Mail Activity — `mailbox_activity` aur `ops_events` se actor-correct rows, jinme Mail Activity page bhi shamil hai.',
          'Login History — `login_audits` entries jaise `login_success`, IP aur timestamp ke saath.',
          'Queue Monitor — Redis queue workers (`alphaspace-queue*`), `/api/health` me `queue_depth` aur daily `queue:prune-failed`.',
          'Brands/Teams — domain create se matching brand banta hai aur account create par `brand_id` validate aur persist hota hai.',
          'Domains — discovery preview, `POST /api/domains`, stable hosts aur SMTP change ke baad `php artisan snappy:generate-domains --check`.',
          'Email Accounts — `POST /api/email-accounts`, encrypted credentials, `/sync-status`, assignment aur Recheck button.',
          'Users — users assign/revoke karein, `POST /api/assignments/recompute` aur `/change-password` par per-user pehli login rotation.',
          'Search — users, accounts, domains aur brands ko loaded arrays par client-side filter karta hai; sirf MailActivity keyset cursor (`occurred_at,id`) istemal karta hai, offset nahi.',
        ],
      },
      {
        id: 'brands-teams-users',
        title: 'Brands, Teams aur User Management',
        groups: [
          {
            title: 'Brands & Access Matrix (/brands)',
            items: [
              '`brands` table ke fields: `domain`, `name`, `status`, `lead_id`, `team_id`, `created_by`.',
              'Maqsad: har domain ke liye access policy, zanjir `domain → team lead → team → mailboxes` ke mutabiq.',
              'Auto-assign preview `POST /api/email-accounts/auto-assign-preview` ko call karta hai aur asli backend data se dikhata hai ke kaun se users ko access milega.',
              'Maujooda halat live data par munhasir hai; har domain ke configured lead aur team ki tasdeeq `/brands` me karein.',
            ],
          },
          {
            title: 'Teams (/teams)',
            items: [
              '`teams` table ke fields: `name`, `brand_id`, `lead_id`; members `team_user` pivot mein rehte hain (`role=member`, `added_by`).',
              'Team banane ke liye `brand_id` aur `lead_id` zaroori hain.',
              'Member add/remove `POST /api/teams/{id}/members` aur `DELETE /api/teams/{id}/members/{userId}` se wired hai.',
              'Malloom masla: FE lead dropdown sirf un users ko dikhata hai jin ka role `team-lead` hai; sirf super-admin maujood hone par `team-lead` user banne tak UI se team nahi ban sakti.',
            ],
          },
          {
            title: 'Team Overview (/team-overview)',
            items: [
              'Teams, members aur assigned mailboxes ka read-only aggregated view.',
              'Route access sirf `super-admin`/`admin`/`team-lead` ke liye hai; `role=user` is page tak nahi pahunch sakta. Admin saari teams dekhte hain aur team lead apni team dekhta hai.',
              'Malloom masla: member identities abhi bhi user fields (`lead_id`/`team_id`) se nikalte hain, `team_user` pivot se nahi, isliye pivot rows hone par bhi dikhaya gaya member list galat ho sakta hai.',
            ],
          },
          {
            title: 'User Management (/users)',
            items: [
              'Roles: `super-admin` (sab kuch), `admin` (operations), `team-lead` (apni team), `user` (sirf assigned mailboxes).',
              'Actions: user create (`name`/`email`/`password`/`role`), `name`/`email`/`role` edit, suspend, unsuspend, soft delete (Trash), restore aur force delete; koi bulk UI maujood nahi hai.',
              'Mailbox assignment Accounts page par `email_account_user` ke through `can_send` aur `can_receive` flags ke saath hota hai.',
              'Maujooda mailbox assignments aur notification recipients live `email_account_user` data par munhasir hain; notifications kis ko milti hain, ye maan-ne se pehle Accounts/Users me verify karein.',
            ],
          },
          {
            title: 'Tajweez kardan setup order',
            numbered: true,
            items: [
              '`/users` me `team-lead` role ka user banayein.',
              '`/brands` me target brand par woh lead set karein (ya naya brand banayein).',
              '`/teams` me brand ke neeche team banayein aur members add karein.',
              'Accounts page par un members ko mailboxes assign karein, `can_receive=1` ke saath.',
              '`/team-overview` me verify karein, aur uski member-derivation limitation ko dhyaan me rakhein.',
            ],
          },
        ],
      },
      {
        id: 'server-move',
        title: 'Mail-server move handling',
        items: [
          'Hostname stable rakhein aur pehle DNS/certificate theek karein; certificate validation kabhi band na karein (`/novalidate-cert`, `IMAP_VALIDATE_CERT=false`, `IMAP_IDLE_VERIFY_PEER=false` aur encryption `none` mana hai).',
          'Alert-only check `php artisan mail:check-server-moves` chalayein (weekly; `checked`/`detected`/`skipped`/`failed` report karta hai aur koi account row nahi badalta).',
          'Mutasir mailbox ka Recheck button use karein (`POST /api/email-accounts/{id}/rediscover`); yeh stored credentials se probe karta hai, kaam karne wale settings adopt karta hai aur auto-paused state clear karta hai.',
          'Teen consecutive failures par account auto-pause hota hai (`sync_enabled=false`, `sync_status=\'paused\'`); success counters clear karti hai aur `resumeIfHealthy()` call karti hai, lekin scheduled sync/IDLE paused account ko probe nahi karte, isliye Recheck ya operator re-enable hi reliable apply path hai.',
          'SMTP change ke baad SnappyMail domain configs regenerate karein aur abhi bhi `pushed_to_server_at IS NULL` dikhane wale rows ke liye reverse push dobara dispatch karein.',
          'Poori procedure: `docs/runbooks/mail-server-move.md`.',
        ],
      },
      {
        id: 'retention',
        title: 'Attachments aur retention',
        items: [
          'Attachments `local` disk par content-addressed hote hain (`FILESYSTEM_ATTACHMENTS_DISK=local`) aur `content_hash` aur shared-blob refcount rakhte hain; ek row delete karne se abhi bhi referenced file nahi hatti.',
          '`attachments:gc` rozana orphan blobs hatata hai; dedupe aur orphan-GC tests pass hue.',
          '`mail:prune --days=3650` (default `MAIL_PRUNE_DAYS`) mail ko local rakhta hai.',
          '`ops:prune-retention` ops data saaf karta hai: `sync_runs` 7d, `issues` 30d, `metrics` 30d aur `operator_actions` 90d.',
          'Attachments alag se backup hote hain; `deploy/backup.sh` generated domain configs bhi copy karta hai.',
        ],
      },
      {
        id: 'services',
        title: 'Services aur schedules',
        items: [
          'Backend NGINX `fastcgi_pass` se PHP-FPM 8.3 par `/run/php/php8.3-fpm.sock` ke through serve hota hai, `php artisan serve` se nahi.',
          'Queue workers (`alphaspace-queue*`), fake IMAP daemon, teen IDLE shards (`alphaspace-idle@0`, `@1`, `@2`) aur scheduler systemd se manage hote hain; Horizon dashboard ya auto-scaling installed nahi hai.',
          '`email:sync-accounts` har 5 minute par staggered delay ke saath dispatch karta hai; `email:reconcile-stuck` bhi har 5 minute par chalta hai.',
          'Rozana schedules: `queue:prune-failed`, `ops:prune-retention`, `attachments:gc` aur `mail:prune`.',
          'Weekly schedule: `mail:check-server-moves` (alert-only).',
          'Restore ke baad restart order: Redis/MySQL → web backend → scheduler → queue workers → IDLE shards → fake IMAP.',
        ],
      },
      {
        id: 'backup',
        title: 'Backup aur restore',
        items: [
          'Dump: `mysqldump --defaults-extra-file=/etc/alphaspace/mysql-client.cnf --single-transaction --quick --routines --triggers --events roundportal | gzip > /var/backups/alphaspace/db_$(date +%F).sql.gz`, phir `.ok` marker.',
          'Drill: scratch `roundportal_restore` me restore karein, `users` / `domains` / `email_accounts` / `emails` / `sync_runs` counts compare karein, phir scratch DB drop karein. PASS dump `/home/masood/REACT-snappy/backups/mysql-drill-20261125-201849.sql.gz` hai.',
          'Bataaya gaya pre-cutover path `/var/backups/alphaspace/database.sqlite.pre-cutover` maujood nahi hai; asli snapshot `/home/masood/REACT-snappy/backups/pre-cutover-20261125-183335/` hai, jisme `code-docs.tar.gz` aur `env.backup` hain. Purana SQLite DB data delete kiya gaya tha, isliye yeh data rollback point nahi hai.',
          'Asli restore: pehle queue workers, saare `alphaspace-idle@*` shards, fake IMAP, scheduler aur web rokain, phir `zcat /var/backups/alphaspace/db_<YYYY-MM-DD>.sql.gz | mysql --defaults-extra-file=/etc/alphaspace/mysql-client.cnf roundportal`.',
          'Env restore: agar maujood ho to `cp -p .env.sqlite-backup.<YYYYMMDDHHMMSS> .env`, warna pre-cutover snapshot se `env.backup` istemal karein; phir `php artisan config:clear && php artisan config:cache && php artisan config:show database.default`. Restore ke dauran `APP_KEY` rotate na karein.',
        ],
      },
      {
        id: 'limitations',
        title: 'Known limitations / accepted risks',
        items: [
          '`10.20.30.250` ke liye self-signed TLS: certificate me IP + DNS SANs hain, lekin clients ko internal/self-signed CA par bharosa karna padta hai; bare IP ke liye public-CA trust available nahi hai.',
          '`APP_KEY` jaan-bujhkar rotate nahi ki gayi taake maujooda encrypted mailbox credentials decrypt hoti rahein; purana git history purge nahi hui.',
          'High-volume mirror contention tests dummy upstream ke saath seeded data par kiye gaye thay; real-IMAP load, provider rate limits aur bari concurrent browser sessions abhi unproven hain.',
          'Horizon installed nahi hai; queue workers systemd units (`alphaspace-queue*`, `alphaspace-idle@*`) aur `/api/health` se manage hote hain.',
          'SMTP-only move recovery best-effort hai: automatic recovery IMAP failure par trigger hoti hai, weekly check alert-only hai, aur Recheck hi reliable apply path hai; rows tab tak `pushed_to_server_at IS NULL` rehte hain jab tak theek karke dobara dispatch na ho.',
          '2026-11-26 ko verify kiya gaya live config: backend `.env` me `APP_ENV=production`, `APP_DEBUG=false` aur `LOG_STACK=single` hai.',
          'Accepted risk: SPA bearer token (480-minute TTL) `sessionStorage` me rehta hai, isliye successful XSS use padh sakti hai; yeh httpOnly cookie nahi hai. SnappyMail cookies SPA auth se alag hain.',
        ],
      },
      {
        id: 'runbook-index',
        title: 'Runbook index',
        items: [
          '`docs/runbooks/cache-down.md` — Throttles, SSO tokens aur unique queue locks ko affect karne wale Redis/cache outages ka diagnosis aur recovery.',
          '`docs/runbooks/db-lock.md` — SQLite ya MySQL par writers kam karein aur database lock / write saturation clear karein.',
          '`docs/runbooks/server-move.md` — Upstream server move / auto-discovery drift ke baad stale domain host settings theek karein.',
          '`docs/runbooks/mail-server-move.md` — Alert-only DNS/TLS drift check aur mail-server moves ke liye controlled Recheck path.',
          '`docs/runbooks/smtp-failure.md` — Failed reverse-push/Sent copies ka triage karein aur SMTP credentials logs me chhode bina store karein.',
          '`docs/runbooks/token-failure.md` — Single-use webmail SSO token failures, clock skew aur throttling ka diagnosis karein.',
          '`docs/runbooks/idle-storm.md` — Jab reconnect attempts aur duplicate dispatches badhein to IDLE shards rokein aur stagger karein.',
          '`docs/runbooks/cert-expiry.md` — NGINX TLS certificate renew/validate karein aur listener drop kiye bina reload karein.',
        ],
      },
    ],
  },

  urdu: {
    header: {
      title: 'پورٹل ورک فلو گائیڈ',
      subtitle: 'زندہ Alphaspace میل پورٹل کے لیے super-admin رہنما۔',
      language: 'زبان',
      roleBadge: 'صرف super-admin',
      jump: 'Runbooks پر جائیں',
      footer: 'Source: docs/SIGNOFF.md and companion audit docs. Super-admin only.',
    },
    sections: [
      {
        id: 'architecture',
        title: 'آرکیٹیکچر / سسٹم کا جائزہ',
        items: [
          'React FE ایک static Vite `dist` کے طور پر سرو ہوتا ہے؛ NGINX `10.20.30.250` پر 443 پر سنتا ہے اور `/api/` اور `/webmail/` کو PHP-FPM 8.3 کو `/run/php/php8.3-fpm.sock` کے ذریعے دیتا ہے (`php artisan serve` نہیں)۔',
          'بیک اینڈ Laravel 13 (`laravel/framework ^13.17`) ہے؛ MySQL 8.0.46 (`roundportal`) اور Redis 6.0.16 `127.0.0.1:6379` پر cache، queue اور sessions کے لیے ہیں۔',
          'اصلی میل کو IMAP sync/IDLE workers مقامی `emails` ٹیبل میں mirror کرتے ہیں؛ SnappyMail 2.38.2 `/webmail/` پر اس mirror کو per-account fake IMAP daemon `127.0.0.1:1143` کے ذریعے پڑھتا ہے۔',
          'Database mirror ہی مقامی میل اسٹور ہے؛ fake IMAP daemon کبھی حقیقی upstream IMAP سرور سے رابطہ نہیں کرتا۔ Attachments `local` ڈسک پر رہتے ہیں اور الگ سے backup ہوتے ہیں۔',
          'میل بھیجنے کے لیے ڈومین کا حقیقی SMTP host استعمال ہوتا ہے؛ خود webmail UI صرف مقامی mirror پڑھتا ہے۔',
        ],
      },
      {
        id: 'setup',
        title: 'ڈومین اور email اکاؤنٹ سیٹ اپ',
        items: [
          'Domains: discovery preview `POST /api/domains/discover` استعمال کریں، پھر `POST /api/domains` سے ڈومین شامل کریں؛ `imap_host` / `smtp_host` کو مستحکم رکھیں اور اُس hostname کا احاطہ کرنے والا trusted certificate استعمال کریں۔',
          'ڈومین SMTP تبدیلی کے بعد `cd /home/masood/REACT-snappy/backend` چلائیں اور `php artisan snappy:generate-domains --check` چلائیں؛ IMAP کو `127.0.0.1:1143` پر pinned رہنا چاہیے، صرف SMTP حقیقی ڈومین کنفیگریشن سے آتا ہے۔',
          'Accounts: `POST /api/email-accounts` سے mailbox شامل کریں؛credentials encrypt ہو کر محفوظ ہوتے ہیں اور responses میں کبھی نہیں آتے۔ Sync کی `/api/email-accounts/{id}/sync-status` اور IMAP Status سے تصدیق کریں۔',
          'Create/edit میں password، ports اور encryption بھیجے جاتے ہیں؛ `brand_id` کی توثیق اور محفوظ کاری ہوتی ہے، اور `PUT|PATCH /email-accounts/{id}` سے password rotate ہو سکتا ہے۔',
          'Assignment: اکاؤنٹ کی تفصیل میں Assign user، یا `PATCH /api/email-accounts/{id}/assign/{userId}` (`DELETE ...` سے ہٹائیں)؛ `POST /api/assignments/recompute` سے دوبارہ حساب کریں۔ جس بھی assignee کا `can_receive=true` ہے، انہیں نئے میل کی notification ملتی ہے۔',
          'Sync flags: IDLE صرف `active` اکاؤنٹس اور `sync_enabled=true` منتخب کرتا ہے؛ تین متواتر ناکامیوں پر `sync_enabled=false` / `sync_status=\'paused\'` سیٹ ہوتے ہیں، جبکہ کامیابی counters صاف کر کے `resumeIfHealthy()` کو کال کرتی ہے۔',
        ],
      },
      {
        id: 'incoming',
        title: 'Incoming میل کا بہاؤ',
        items: [
          'حقیقی IMAP IDLE تین systemd shards میں چلتا ہے: `alphaspace-idle@0`، `alphaspace-idle@1` اور `alphaspace-idle@2`؛ IMAP Status صرف `status`، `uidnext`، `users` اور `last_check` دیتا ہے، جن میں status `connected`، `reconnecting`، `error`، `paused` یا `syncing` ہوتی ہے؛ reconnect attempts شامل نہیں۔',
          '`SyncAccountEmailsJob` سب سے پرانے بیچوں کو UID watermark / `UIDVALIDITY` گارڈ اور dedupe کے ساتھ mirror کرتا ہے؛ رنز `sync_runs` میں درج ہوتے ہیں اور 5-minute stagger (`email:sync-accounts`) پر بھیجے جاتے ہیں۔',
          'Ingest پر ہر اُس assignee کے لیے notification row بنتی ہے جس کا `can_receive=true` ہے؛ FE ہر 2 s پر poll کرتا ہے۔',
          'Fake IMAP daemon صرف مقامی mirror سرو کرتا ہے؛ اُس کا IDLE راستہ 4-second full-folder snapshot کی بجائے `(account,folder)` کے لیے Redis `emails_version` change token استعمال کرتا ہے۔',
          'SnappyMail کا iframe پورٹل میں `postMessage` کے ذریعے فوراً refresh ہوتا ہے۔',
        ],
      },
      {
        id: 'outgoing',
        title: 'Outgoing میل کا بہاؤ',
        items: [
          'SnappyMail میں compose: پیغام loopback SMTP relay `127.0.0.1:2525` پر جاتا ہے؛ relay `can_send`، session اور RCPT checks نافذ کرتا ہے، پھر server-side credentials کے ساتھ DB-driven upstream SMTP کے ذریعے deliver کرتا ہے (اصل mailbox SMTP credentials کبھی SnappyMail کو نہیں بھیجے جاتے)۔',
          'Relay قبولیت کے بعد مقامی Sent mirror اپ ڈیٹ ہوتا ہے اور reverse-push idempotency downstream duplicate delivery روکتی ہے؛ `PushSentEmailsToServerJob::sendSmtp()` server-side delivery path رہتا ہے جو Eloquent encrypted casts استعمال کرتا ہے۔',
          'Relay سے پہلے SnappyMail direct SMTP ثابت نہیں تھا اور مؤثر طور پر broken تھا؛ صرف portal-side/server-side push ثابت تھا (audit evidence: `webmail_sent_rows=0`, تمام 8 Sent rows `sent_via_webmail=0`, audit وقت `:2525` listener نہیں تھا)۔',
          'ناکامی پر unpushed rows `pushed_to_server_at IS NULL` رہتے ہیں جب تک سیٹنگز درست کر کے job دوبارہ dispatch نہ ہو؛ SMTP host بدلنے پر پرانے SnappyMail domain SMTP بلاکس کو regenerate کرنا پڑتا ہے۔',
          'End-to-end verification Gate 1 حقیقی E2E ٹیسٹ تک pending ہے؛ UI-level exactly-once اس ٹیسٹ کے pass ہونے تک NOT PROVEN ہے۔',
        ],
      },
      {
        id: 'sso',
        title: 'SSO اور iframe',
        items: [
          '`POST /api/email-accounts/{id}/webmail-token` single-use token دیتا ہے؛ FE اُسے `/webmail/portal-sso.php` پر post کرتا ہے، جو `/webmail/?sso` کو ہدف بنانے والا HTML auto-submit POST form واپس کرتا ہے۔',
          'SSO hash POST body میں آتا ہے، query string میں نہیں۔',
          '`portal-sso.php` one-time token استعمال کرتا ہے اور صرف محفوظ شدہ account/domain rows استعمال کرتا ہے۔',
          'SnappyMail AppData میں `Auth=True` ہے اور cookies `smsession`، `smctoken` اور `smaccount` سیٹ ہوتی ہیں؛ کوئی login فارم نہیں ہے۔',
          'Iframe کا ماخذ مقامی mirror سے بنتا ہے اور `postMessage` سے refresh ہوتا ہے۔',
        ],
      },
      {
        id: 'audit',
        title: 'صارف کے اعمال کا آڈٹ',
        items: [
          '`portal-audit` SnappyMail plugin صارف کے اعمال کو ہک کرتا ہے اور `POST /api/webmail/activity` کو کال کرتا ہے، جو 204 واپس کرتا ہے۔',
          '`actor_id` اور `email_account_id` تصدیق شدہ webmail session سے حل ہوتے ہیں، درخواست کے ان پٹ سے نہیں۔',
          'Rows `mailbox_activity` اور `ops_events` میں جاتے ہیں؛ Activity Logs causer، description، subject اور time دکھاتا ہے، جبکہ Mail Activity actor، action، mailbox، subject اور timestamp دکھاتا ہے۔',
          'Write راستہ `POST /api/webmail/activity` ہے؛ read راستہ `GET /api/webmail/activity-log` (Mail Activity) ہے، جبکہ Activity Logs `GET /api/activity-logs` استعمال کرتا ہے۔ Ops correlations `ops_events` ٹیبل میں محفوظ ہوتے ہیں۔',
          'ایک دستی actor row DB/API سطح پر تصدیق ہوئی؛ براؤزر اسکرین شاٹ محفوظ نہیں ہوا۔',
        ],
      },
      {
        id: 'notifications',
        title: 'Notifications',
        items: [
          'Ingest پر ہر assignee کے لیے notification row بنتی ہے؛ دستاویزی اصول ہر `can_receive=true` والا assignee ہے۔',
          'FE ہر 2 s پر `GET /notifications/poll` کو poll کرتا ہے؛ live throttle `throttle:6000,1` (فی منٹ) ہے۔',
          'زندہ براؤزر toast DB/API سطح پر تصدیق ہوا؛ بصری کیپچر محفوظ نہیں ہوا، اور یہ sign-off میں accepted residual ہے۔',
          'SPA bearer token کی TTL 480 منٹ ہے اور یہ `sessionStorage` میں محفوظ ہوتا ہے، httpOnly cookie میں نہیں۔',
          '`/api/ops/stream` cursor پر مبنی ہے؛ MailActivity keyset cursor (`occurred_at,id`) استعمال کرتا ہے، offset نہیں، اور Search client-side arrays کو فلٹر کرتا ہے۔',
        ],
      },
      {
        id: 'ops',
        title: 'Ops Console اور error reporting',
        items: [
          'Ops Console `/api/ops/summary`، `/api/ops/sync-runs`، `/api/ops/issues`، `/api/ops/mail` اور `/api/ops/stream` (cursor) پڑھتا ہے؛ FE کوئی events endpoint نہیں پڑھتا، correlations `ops_events` میں رہتے ہیں۔',
          'صحت `/api/health` سے ملتی ہے، جس میں `checks.db/cache/queue/imap` اور `queue_depth` شامل ہیں۔',
          'FE `window.onerror`، `unhandledrejection` اور axios interceptor `POST /api/ops/errors` پر رپورٹ کرتے ہیں (HTTP 5xx/405/404)۔',
          'PHP `$exceptions->reportable(...)` `RecordExceptionJob` کو فیڈ کرتا ہے، جو `issues` کو upsert اور `ops_events` کو insert کرتا ہے؛ correlation اور unique `issues.correlation_id` پر Redis rate limit سے dedupe ہوتی ہے۔',
          'Ops retention: `sync_runs` 7d، `issues` 30d، `metrics` 30d اور `operator_actions` 90d؛ `LOG_STACK=single` اور `LOG_LEVEL=warning`۔',
          'Credentials کو responses سے صاف کیا جاتا ہے اور انہیں logs، queue payloads یا ٹکٹوں میں کبھی نہیں آنا چاہیے۔',
        ],
      },
      {
        id: 'admin-menu',
        title: 'Administration مینو گائیڈ',
        items: [
          'Live Operations — Ops Console کے `/api/ops/*` endpoints کے ساتھ `/api/health` چیکس اور queue depth۔',
          'IMAP Status — `/admin/imap-status` ہر 30 s پر poll کرتا ہے اور صرف `status`، `uidnext`، `users` اور `last_check` دیتا ہے (`connected`، `reconnecting`، `error`، `paused`، `syncing`)؛ reconnect attempt counts شامل نہیں۔',
          'Activity Logs — `/activity-logs` `GET /api/activity-logs` پڑھتا ہے اور causer، description، subject اور time دکھاتا ہے۔',
          'Mail Activity — `mailbox_activity` اور `ops_events` سے درست actor والی rows، جن میں Mail Activity صفحہ بھی شامل ہے۔',
          'Login History — `login_audits` اندراجات جیسے `login_success`، IP اور timestamp کے ساتھ۔',
          'Queue Monitor — Redis queue workers (`alphaspace-queue*`)، `/api/health` میں `queue_depth` اور روزانہ `queue:prune-failed`۔',
          'Brands/Teams — ڈومین بنانے پر مماثل brand بنتا ہے اور اکاؤنٹ بناتے وقت `brand_id` کی توثیق اور محفوظ کاری ہوتی ہے۔',
          'Domains — discovery preview، `POST /api/domains`، مستحکم hosts اور SMTP تبدیلی کے بعد `php artisan snappy:generate-domains --check`۔',
          'Email Accounts — `POST /api/email-accounts`، encrypted credentials، `/sync-status`، assignment اور Recheck بٹن۔',
          'Users — صارفین کو تفویض/واپس کریں، `POST /api/assignments/recompute` اور `/change-password` پر ہر صارف کی پہلی لاگ ان گردانی۔',
          'Search — users، accounts، domains اور brands کو loaded arrays پر client-side فلٹر کرتا ہے؛ صرف MailActivity keyset cursor (`occurred_at,id`) استعمال کرتا ہے، offset نہیں۔',
        ],
      },
      {
        id: 'brands-teams-users',
        title: 'Brands، Teams aur User Management',
        groups: [
          {
            title: 'Brands & Access Matrix (/brands)',
            items: [
              '`brands` ٹیبل کے فیلڈز: `domain`، `name`، `status`، `lead_id`، `team_id`، `created_by`۔',
              'مقصد: ہر ڈومین کے لیے access policy، زنجیر `domain → team lead → team → mailboxes` کے مطابق۔',
              'Auto-assign preview `POST /api/email-accounts/auto-assign-preview` کو کال کرتا ہے اور حقیقی backend ڈیٹا سے دکھاتا ہے کہ کون سے صارفین کو رسائی حاصل ہوگی۔',
              'حالیہ حالت براہِ راست ڈیٹا پر منحصر ہے؛ ہر ڈومین کے لیے ترتیب شدہ لیڈ اور ٹیم کی تصدیق `/brands` میں کریں۔',
            ],
          },
          {
            title: 'Teams (/teams)',
            items: [
              '`teams` ٹیبل کے فیلڈز: `name`، `brand_id`، `lead_id`؛ ارکان `team_user` pivot میں محفوظ ہیں (`role=member`، `added_by`)۔',
              'ٹیم بنانے کے لیے `brand_id` اور `lead_id` درکار ہیں۔',
              'رکن شامل/حذف کرنا `POST /api/teams/{id}/members` اور `DELETE /api/teams/{id}/members/{userId}` کے ذریعے wired ہے۔',
              'معلوم حد: FE lead ڈراپ ڈاؤن صرف ان صارفین کو دکھاتا ہے جن کا کردار `team-lead` ہے؛ صرف super-admin موجود ہونے پر `team-lead` صارف بننے تک UI سے ٹیم نہیں بنائی جا سکتی۔',
            ],
          },
          {
            title: 'Team Overview (/team-overview)',
            items: [
              'ٹیمز، ارکان اور تفویض شدہ mailboxes کا صرف پڑھنے کے قابل aggregated منظر۔',
              'راستہ صرف `super-admin`/`admin`/`team-lead` کے لیے ہے؛ `role=user` اس صفحے تک نہیں پہنچ سکتا۔ Admin تمام ٹیمز دیکھتے ہیں اور team lead اپنی ٹیم دیکھتا ہے۔',
              'معلوم حد: ارکان کی شناخت اب بھی صارف کے فیلڈز (`lead_id`/`team_id`) سے حاصل کی جاتی ہے، `team_user` pivot سے نہیں، اس لیے pivot سطریں موجود ہونے کے باوجود دکھائی گئی فہرست غلط ہو سکتی ہے۔',
            ],
          },
          {
            title: 'User Management (/users)',
            items: [
              'کردار: `super-admin` (سب کچھ)، `admin` (آپریشنز)، `team-lead` (اپنی ٹیم)، `user` (صرف تفویض شدہ mailboxes)۔',
              'اعمال: صارف تخلیق (`name`/`email`/`password`/`role`)، `name`/`email`/`role` میں ترمیم، suspend، unsuspend، soft delete (Trash)، restore اور force delete؛ کوئی bulk UI موجود نہیں ہے۔',
              'Mailbox کی تفویض Accounts صفحے پر `email_account_user` کے ذریعے `can_send` اور `can_receive` پرچموں کے ساتھ ہوتی ہے۔',
              'موجودہ mailbox تفویض اور اطلاع وصول کرنے والے براہِ راست `email_account_user` ڈیٹا پر منحصر ہیں؛ یہ ماننے سے پہلے کہ اطلاعات کس کو ملتی ہیں، Accounts/Users میں تصدیق کریں۔',
            ],
          },
          {
            title: 'تجویز کردہ setup ترتیب',
            numbered: true,
            items: [
              '`/users` میں `team-lead` کردار کا صارف بنائیں۔',
              '`/brands` میں ہدف برانڈ پر وہ لیڈ مقرر کریں (یا نیا برانڈ بنائیں)۔',
              '`/teams` میں برانڈ کے تحت ٹیم بنائیں اور ارکان شامل کریں۔',
              'Accounts صفحے پر ان ارکان کو mailboxes تفویض کریں، `can_receive=1` کے ساتھ۔',
              '`/team-overview` میں تصدیق کریں اور اس کی member-derivation حد کو ذہن میں رکھیں۔',
            ],
          },
        ],
      },
      {
        id: 'server-move',
        title: 'میل سرور کی منتقلی کا طریقہ',
        items: [
          'Hostname مستحکم رکھیں اور پہلے DNS/certificate درست کریں؛ certificate validation کبھی بند نہ کریں (`/novalidate-cert`، `IMAP_VALIDATE_CERT=false`، `IMAP_IDLE_VERIFY_PEER=false` اور encryption `none` ممنوع ہیں)۔',
          'صرف الرٹ دینے والا چیک `php artisan mail:check-server-moves` چلائیں (ہفتہ وار؛ `checked`/`detected`/`skipped`/`failed` رپورٹ کرتا ہے اور کسی اکاؤنٹ row کو تبدیل نہیں کرتا)۔',
          'متاثرہ mailbox کا Recheck بٹن استعمال کریں (`POST /api/email-accounts/{id}/rediscover`)؛ یہ محفوظ credentials سے جانچ کرتا ہے، کام کرنے والی سیٹنگز اپناتا ہے اور auto-paused حالت ختم کرتا ہے۔',
          'تین متواتر ناکامیوں پر اکاؤنٹ خودکار طور پر رک جاتا ہے (`sync_enabled=false`، `sync_status=\'paused\'`)؛ کامیابی counters صاف کر کے `resumeIfHealthy()` کو کال کرتی ہے، لیکن scheduled sync/IDLE رکے ہوئے اکاؤنٹ کو جانچتے نہیں، اس لیے Recheck یا operator re-enable ہی قابلِ اعتماد راستہ ہے۔',
          'SMTP تبدیلی کے بعد SnappyMail domain configs دوبارہ بنائیں اور اب بھی `pushed_to_server_at IS NULL` دکھانے والے rows کے لیے reverse push دوبارہ بھیجیں۔',
          'مکمل طریقہ کار: `docs/runbooks/mail-server-move.md`۔',
        ],
      },
      {
        id: 'retention',
        title: 'Attachments اور retention',
        items: [
          'Attachments `local` ڈسک پر content-addressed ہوتے ہیں (`FILESYSTEM_ATTACHMENTS_DISK=local`) اور ان میں `content_hash` اور shared-blob refcount ہوتا ہے؛ ایک row حذف کرنے سے اب بھی استعمال ہونے والی فائل نہیں ہٹتی۔',
          '`attachments:gc` روزانہ بے استعمال blobs ہٹاتا ہے؛ dedupe اور orphan-GC ٹیسٹ کامیاب ہوئے۔',
          '`mail:prune --days=3650` (default `MAIL_PRUNE_DAYS`) میل کو مقامی طور پر محفوظ رکھتا ہے۔',
          '`ops:prune-retention` ops ڈیٹا صاف کرتا ہے: `sync_runs` 7d، `issues` 30d، `metrics` 30d اور `operator_actions` 90d۔',
          'Attachments الگ سے backup ہوتے ہیں؛ `deploy/backup.sh` generated domain configs بھی کاپی کرتا ہے۔',
        ],
      },
      {
        id: 'services',
        title: 'Services اور schedules',
        items: [
          'بیک اینڈ NGINX `fastcgi_pass` کے ذریعے PHP-FPM 8.3 کو `/run/php/php8.3-fpm.sock` پر سرو ہوتا ہے، `php artisan serve` سے نہیں۔',
          'Queue workers (`alphaspace-queue*`)، fake IMAP daemon، تین IDLE shards (`alphaspace-idle@0`، `@1`، `@2`) اور scheduler systemd کے ذریعے منجمنٹ ہوتے ہیں؛ Horizon dashboard یا auto-scaling انسٹال نہیں ہے۔',
          '`email:sync-accounts` ہر 5 منٹ بعد staggered delay کے ساتھ بھیجتا ہے؛ `email:reconcile-stuck` بھی ہر 5 منٹ بعد چلتا ہے۔',
          'روزانہ schedules: `queue:prune-failed`، `ops:prune-retention`، `attachments:gc` اور `mail:prune`۔',
          'ہفتہ وار schedule: `mail:check-server-moves` (صرف الرٹ)۔',
          'بحالی کے بعد دوبارہ شروع کرنے کی ترتیب: Redis/MySQL → web backend → scheduler → queue workers → IDLE shards → fake IMAP۔',
        ],
      },
      {
        id: 'backup',
        title: 'Backup اور restore',
        items: [
          'Dump: `mysqldump --defaults-extra-file=/etc/alphaspace/mysql-client.cnf --single-transaction --quick --routines --triggers --events roundportal | gzip > /var/backups/alphaspace/db_$(date +%F).sql.gz`، پھر `.ok` نشان۔',
          'Drill: scratch `roundportal_restore` میں بحال کریں، `users` / `domains` / `email_accounts` / `emails` / `sync_runs` کی تعداد موازنہ کریں، پھر scratch DB حذف کریں۔ کامیاب dump `/home/masood/REACT-snappy/backups/mysql-drill-20261125-201849.sql.gz` ہے۔',
          'بتایا گیا pre-cutover راستہ `/var/backups/alphaspace/database.sqlite.pre-cutover` موجود نہیں ہے؛ اصل سنیپ شاٹ `/home/masood/REACT-snappy/backups/pre-cutover-20261125-183335/` ہے، جس میں `code-docs.tar.gz` اور `env.backup` ہیں۔ پرانا SQLite ڈیٹا حذف کیا گیا تھا، اس لیے یہ data rollback نقطہ نہیں ہے۔',
          'حقیقی restore: پہلے queue workers، تمام `alphaspace-idle@*` shards، fake IMAP، scheduler اور web روکیں، پھر `zcat /var/backups/alphaspace/db_<YYYY-MM-DD>.sql.gz | mysql --defaults-extra-file=/etc/alphaspace/mysql-client.cnf roundportal`۔',
          'Env restore: اگر موجود ہو تو `cp -p .env.sqlite-backup.<YYYYMMDDHHMMSS> .env`، ورنہ pre-cutover سنیپ شاٹ سے `env.backup` استعمال کریں؛ پھر `php artisan config:clear && php artisan config:cache && php artisan config:show database.default`۔ بحالی کے دوران `APP_KEY` rotate نہ کریں۔',
        ],
      },
      {
        id: 'limitations',
        title: 'معلوم حدود / قبول شدہ خطرات',
        items: [
          '`10.20.30.250` کے لیے خود دستخط شدہ TLS: سرٹیفکیٹ میں IP + DNS SANs ہیں، لیکن کلائنٹس کو داخلی/خود دستخط شدہ CA پر اعتبار کرنا پڑتا ہے؛ سادہ IP کے لیے عوامی CA کا اعتبار دستیاب نہیں ہے۔',
          '`APP_KEY` جان بوجھ کر rotate نہیں کی گئی تاکہ موجودہ encrypted mailbox credentials قابلِ خواندہ رہیں؛ پرانی git history صاف نہیں کی گئی۔',
          'زیادہ حجم کے mirror contention ٹیسٹ ڈمی upstream کے ساتھ seeded ڈیٹا پر کیے گئے تھے؛ حقیقی IMAP بوجھ، فراہم کنندہ کی شرح حدیں اور بڑی تعداد میں بیک وقت براؤزر سیشنز ابھی ثابت نہیں ہوئے۔',
          'Horizon انسٹال نہیں ہے؛ queue workers systemd units (`alphaspace-queue*`، `alphaspace-idle@*`) اور `/api/health` کے ذریعے منجمنٹ ہوتے ہیں۔',
          'صرف SMTP والی منتقلی کی بحالی بہترین کوشش ہے: خودکار بحالی IMAP ناکامی پر شروع ہوتی ہے، ہفتہ وار چیک صرف الرٹ دیتا ہے، اور Recheck قابلِ اعتماد راستہ ہے؛ درست اور دوبارہ بھیجے جانے تک rows `pushed_to_server_at IS NULL` رہتے ہیں۔',
          '2026-11-26 کو تصدیق شدہ حقیقی کنفیگریشن: بیک اینڈ `.env` میں `APP_ENV=production`، `APP_DEBUG=false` اور `LOG_STACK=single` ہے۔',
          'قبول شدہ خطرہ: SPA bearer token (480 منٹ TTL) `sessionStorage` میں رہتا ہے، اس لیے کامیاب XSS اُسے پڑھ سکتی ہے؛ یہ httpOnly cookie نہیں ہے۔ SnappyMail cookies SPA auth سے الگ ہیں۔',
        ],
      },
      {
        id: 'runbook-index',
        title: 'Runbook فہرست',
        items: [
          '`docs/runbooks/cache-down.md` — ان حد بندیوں، SSO ٹوکنز اور منفرد queue لاکس کو متاثر کرنے والے Redis/cache کی خرابیوں کی تشخیص اور بحالی۔',
          '`docs/runbooks/db-lock.md` — SQLite یا MySQL پر لکھنے والوں کی تعداد کم کریں اور database lock / write saturation ختم کریں۔',
          '`docs/runbooks/server-move.md` — upstream server move / auto-discovery بھٹکنے کے بعد پرانی domain host سیٹنگز درست کریں۔',
          '`docs/runbooks/mail-server-move.md` — صرف الرٹ دینے والی DNS/TLS تبدیلی کی جانچ اور میل سرور کی منتقلی کے لیے قابو شدہ Recheck راستہ۔',
          '`docs/runbooks/smtp-failure.md` — ناکام reverse-push/Sent کاپیوں کی چھان بین کریں اور SMTP اسناد لاگ میں چھوڑے بغیر محفوظ کریں۔',
          '`docs/runbooks/token-failure.md` — single-use webmail SSO ٹوکن کی ناکامی، clock skew اور throttling کی تشخیص کریں۔',
          '`docs/runbooks/idle-storm.md` — جب reconnect attempts اور duplicate dispatches بڑھ جائیں تو IDLE shards روکیں اور پھیلائیں۔',
          '`docs/runbooks/cert-expiry.md` — NGINX TLS سرٹیفکیٹ تجدید/تصدیق کریں اور بغیر listener گرائے reload کریں۔',
        ],
      },
    ],
  },
}

const LANGUAGES = [
  { key: 'en', label: 'English', lang: 'en' },
  { key: 'roman', label: 'Roman Urdu', lang: 'ur-Latn' },
  { key: 'urdu', label: 'اردو', lang: 'ur' },
]

function RichText({ text }) {
  return String(text).split(/(`[^`]+`)/g).map((part, i) => (
    part.startsWith('`') && part.endsWith('`')
      ? <code key={i} className="surface-2 rounded px-1 py-0.5 font-mono text-[0.9em]">{part.slice(1, -1)}</code>
      : <span key={i}>{part}</span>
  ))
}

export default function WorkflowGuide() {
  const [language, setLanguage] = useState('en')
  const copy = CONTENT[language]
  const isUrdu = language === 'urdu'
  const langTag = LANGUAGES.find(l => l.key === language)?.lang || 'en'

  return (
    <div
      dir={isUrdu ? 'rtl' : 'ltr'}
      lang={langTag}
      className="space-y-4"
      style={isUrdu ? { fontFamily: "'Noto Naskh Arabic', 'Noto Nastaliq Urdu', 'Gulzar', var(--font-sans)", lineHeight: 1.9 } : undefined}
    >
      <Breadcrumbs title={copy.header.title} />

      <PageHeader
        title={copy.header.title}
        subtitle={copy.header.subtitle}
        actions={[
          <Badge key="role" variant="danger">{copy.header.roleBadge}</Badge>,
          <Button key="jump" variant="secondary" size="sm" onClick={() => document.getElementById('runbook-index')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            {copy.header.jump}
          </Button>,
        ]}
      />

      <Card>
        <CardBody className="space-y-3">
          <p className="text-xs font-semibold text-muted">{copy.header.language}</p>
          <Tabs tabs={LANGUAGES.map(l => ({ key: l.key, label: l.label }))} active={language} onChange={setLanguage} />
          <p className="text-xs text-muted">{copy.header.subtitle}</p>
        </CardBody>
      </Card>

      {copy.sections.map((section, index) => (
        <Card key={section.id} id={section.id} className="scroll-mt-24">
          <CardBody>
            <div className={`flex items-center gap-3 mb-3 ${isUrdu ? 'flex-row-reverse' : ''}`}>
              <Badge variant="primary">{String(index + 1).padStart(2, '0')}</Badge>
              <h2 className="text-lg font-semibold">{section.title}</h2>
            </div>
            {section.groups ? (
              <div className="space-y-4">
                {section.groups.map((group, gi) => {
                  const listClass = `space-y-2 text-sm text-muted ${group.numbered ? 'list-decimal' : 'list-disc'} ${isUrdu ? 'pr-5 text-right' : 'pl-5'}`
                  const items = group.items.map((item, i) => (
                    <li key={i}><RichText text={item} /></li>
                  ))
                  return (
                    <div key={gi}>
                      <h3 className={`text-sm font-semibold text-[var(--text)] mb-2 ${isUrdu ? 'text-right' : 'text-left'}`}>{group.title}</h3>
                      {group.numbered ? <ol className={listClass}>{items}</ol> : <ul className={listClass}>{items}</ul>}
                    </div>
                  )
                })}
              </div>
            ) : (
              <ul className={`space-y-2 text-sm text-muted list-disc ${isUrdu ? 'pr-5 text-right' : 'pl-5'}`}>
                {section.items.map((item, i) => {
                  const menuParts = section.id === 'admin-menu' && item.includes(' — ') ? item.split(' — ') : null
                  return (
                    <li key={i}>
                      {menuParts ? (
                        <>
                          <strong className="font-semibold text-[var(--text)]">{menuParts[0]}</strong>
                          <span> — <RichText text={menuParts.slice(1).join(' — ')} /></span>
                        </>
                      ) : <RichText text={item} />}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      ))}

      <p className="pt-2 text-xs text-muted">{copy.header.footer}</p>
    </div>
  )
}
