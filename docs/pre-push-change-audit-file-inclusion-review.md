# Pre-Push Change Audit dan File Inclusion Review

Tanggal: 2026-06-24
Task: 174
Prioritas: High
Status: AUDIT COMPLETE - READY FOR QA BEFORE COMMIT

## Tujuan

Dokumen ini mencatat audit perubahan sebelum commit/push. Fokus audit adalah memastikan file yang masuk Git memang relevan, tidak membawa secret, tidak membawa file besar yang tidak perlu, dan tidak memasukkan duplikat.

## Git Scope Summary

Current branch: `main`

Remote:

- `origin https://github.com/farhamzah/pharmsita.git`

Working tree summary:

- Modified tracked files: 19
- Untracked files/folders: 51
- Tracked diff size: 3261 insertions, 182 deletions
- Largest untracked file: `docs/database pharmsita.pdf` sekitar 1.1 MB
- No `node_modules`, `dist`, or `releases` folder detected in changed scope

## Modified Tracked Files

Modified tracked files are expected for this batch:

- Backend repository/API/migration boundary files.
- Frontend coordinator directory/reporting files.
- Shared UI table files.
- Smoke/QA tool files.
- Release bundle tooling and packaging docs.

Recommendation: include after Task 175 QA passes.

## New Migration Files

Include:

- `backend/database/migrations/009_canonical_pharmsita_schema_boundary.sql`
- `backend/database/migrations/010_canonical_read_models.sql`

Reason:

- These are part of canonical PharmSITA schema/read model alignment.
- They should be versioned with backend repository changes.

## New Documentation Files

Include:

- Canonical schema/write path/read model/reporting docs.
- Coordinator student directory QA/production smoke docs.
- Production evidence/sign-off/remediation gate docs.
- Operator intake/runbook docs.
- Source alignment docs in `docs/reference/pharmsita-detail-2026-06-24/`.

Reason:

- These documents explain the implementation boundary and production readiness chain.
- They are needed for release review and future continuation.

## Reference Database Files

Include with caution:

- `docs/database pharmsita.sql`
- `docs/database pharmsita.pdf`

Audit result:

- `docs/database pharmsita.sql` appears to contain schema DDL and foreign keys.
- No `INSERT` data rows were detected in the SQL scan.
- SQL includes table names such as `users` and `password_hash`, but as schema fields, not actual user data.
- PDF size is about 1.1 MB, acceptable for a reference artifact if the repo should preserve the database source reference.

Recommendation:

- Include both files if the repository should preserve the canonical database reference from the user.
- If Git history should stay lean, include only the extracted/reference text and keep the PDF outside Git.

## Duplicate File Finding

Hold/exclude from staging unless explicitly needed:

- `docs/Alur Aplikasi PharmSITA rev.pdf`

Reason:

- SHA-256 hash matches existing tracked file `docs/Alur Aplikasi PharmSITA.pdf`.
- It is an exact duplicate by hash.
- Committing it would add a second identical binary file without adding new information.

Recommended action for Task 175:

- Do not stage `docs/Alur Aplikasi PharmSITA rev.pdf`.
- Keep it local or remove later only with explicit user approval.

## Secret and Sensitive Data Scan

Scan patterns checked:

- `DATABASE_URL=`
- `AUTH_SECRET=`
- `JWT_SECRET=`
- private key markers
- API key/token assignments
- password assignments

Result:

- No new real `.env` file was detected in the changed scope.
- Hits are mostly code variables, examples, placeholders, and runbook instructions.
- Existing docs contain placeholder/demo examples such as `demo`, `change-this-password`, `<password-kuat>`, and redacted `***`.
- No obvious private key or live token was detected from the audit command output.

Risk note:

- Before push, avoid staging any local evidence folder that contains real `DATABASE_URL`, token, password, `.env`, SSH key, or production sign-off attachment with secrets.

## File Inclusion Decision

| File group | Decision | Reason |
| --- | --- | --- |
| Backend source changes | Include after QA | Required for repository/API persistence work. |
| Frontend coordinator changes | Include after QA | Required for reporting/directory UX. |
| Migration SQL files | Include | Required schema/read-model versioning. |
| Tooling changes | Include after syntax/build QA | Required smoke/release automation. |
| Production evidence docs | Include | Required audit trail and release gates. |
| `docs/reference/pharmsita-detail-2026-06-24/` | Include | Source reference used for alignment. |
| `docs/database pharmsita.sql` | Include with caution | Schema-only scan; no INSERT detected. |
| `docs/database pharmsita.pdf` | Include with caution | Canonical reference, 1.1 MB binary. |
| `docs/Alur Aplikasi PharmSITA rev.pdf` | Hold/exclude | Exact duplicate of tracked PDF. |

## Pre-Push Risk Register

| Risk | Level | Status | Mitigation |
| --- | --- | --- | --- |
| Duplicate PDF committed | Medium | Open | Exclude `docs/Alur Aplikasi PharmSITA rev.pdf` from staging. |
| Production evidence missing | High | Expected | Do not claim production sign-off; docs already mark blocked. |
| Secret in future evidence attachment | Extra High | Not detected now | Keep evidence folders out of Git unless sanitized. |
| Build regression from large code batch | High | Pending QA | Run Task 175 QA before commit. |
| CRLF warnings | Low | Known | Git reports line ending normalization warnings only. |

## Recommended Staging Strategy

Use targeted staging, not `git add .`.

Stage:

- modified backend/frontend/tooling files;
- new migration SQL files;
- generated documentation files;
- reference source files that are not duplicates.

Do not stage:

- `docs/Alur Aplikasi PharmSITA rev.pdf`;
- any future local production evidence with secrets;
- generated build folders such as `dist`, `releases`, or `node_modules`.

## Verification Performed

Commands/checks performed:

- `git status --short`
- `git diff --stat`
- untracked file size review
- reference folder size review
- secret-pattern scan
- SQL reference scan for `INSERT`, password, token, user/email indicators
- SHA-256 duplicate check for PDF references
- `git diff --check`

Result:

- Audit passed with one hold item: duplicate PDF.
- No blocker found for proceeding to QA.
- Commit/push should wait for build/smoke verification.

## Task Berikutnya

Task 175: Build/Smoke Verification Before Commit

Prioritas: High

Reason:

- File inclusion audit is complete.
- Before staging/commit/push, run syntax/build/smoke checks so GitHub receives a verified baseline.

## Task 175 Verification Record

Task 175 sudah dicatat di `docs/build-smoke-verification-before-commit.md`.

Status Task 175: `PASS WITH WARNING`

Catatan:

- Frontend build PASS.
- Backend build PASS.
- Tool syntax check PASS.
- Release package dry run PASS.
- Warning tersisa: Vite chunk size lebih dari 500 kB dan production evidence belum tersedia.
