#!/usr/bin/env bash
set -Eeuo pipefail

DOMAIN="${PHARMSITA_DOMAIN:-pharmsita.safaubp.com}"
RELEASE_DIR="${PHARMSITA_RELEASE_DIR:-/var/www/pharmsita/current}"
ENV_FILE="${PHARMSITA_ENV_FILE:-/etc/pharmsita/backend.env}"
BACKEND_SERVICE="${PHARMSITA_BACKEND_SERVICE:-pharmsita-backend}"
BACKEND_PORT="${PHARMSITA_BACKEND_PORT:-4000}"
NGINX_TARGET="${PHARMSITA_NGINX_TARGET:-/etc/nginx/conf.d/pharmsita.conf}"
NGINX_SOURCE="${PHARMSITA_NGINX_SOURCE:-${RELEASE_DIR}/deploy/vps/nginx/pharmsita.safaubp.com-http.conf.example}"
EVIDENCE_ROOT="${PHARMSITA_EVIDENCE_ROOT:-/tmp/pharmsita-task202-routing-evidence}"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
EVIDENCE_DIR="${EVIDENCE_ROOT}/${RUN_ID}"
FRONTEND_URL="http://${DOMAIN}"
API_BASE_URL="${FRONTEND_URL}/api/v1"

mkdir -p "${EVIDENCE_DIR}"

log() {
  printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*" | tee -a "${EVIDENCE_DIR}/operator-run.log"
}

capture() {
  local name="$1"
  shift
  log "RUN ${name}: $*"
  set +e
  "$@" >"${EVIDENCE_DIR}/${name}.txt" 2>&1
  local status=$?
  set -e
  printf '%s\n' "${status}" >"${EVIDENCE_DIR}/${name}.exit"
  if [ "${status}" -ne 0 ]; then
    log "WARN ${name} exited ${status}"
  fi
}

capture_shell() {
  local name="$1"
  local command="$2"
  log "RUN ${name}: ${command}"
  set +e
  bash -lc "${command}" >"${EVIDENCE_DIR}/${name}.txt" 2>&1
  local status=$?
  set -e
  printf '%s\n' "${status}" >"${EVIDENCE_DIR}/${name}.exit"
  if [ "${status}" -ne 0 ]; then
    log "WARN ${name} exited ${status}"
  fi
}

http_code() {
  local url="$1"
  curl -sS -o /dev/null -w '%{http_code}' "${url}" || true
}

exit_code_for() {
  local name="$1"
  if [ -f "${EVIDENCE_DIR}/${name}.exit" ]; then
    tr -d '\r\n' <"${EVIDENCE_DIR}/${name}.exit"
  else
    printf 'missing'
  fi
}

write_safe_context() {
  {
    printf 'task=202\n'
    printf 'run_id=%s\n' "${RUN_ID}"
    printf 'domain=%s\n' "${DOMAIN}"
    printf 'release_dir=%s\n' "${RELEASE_DIR}"
    printf 'frontend_url=%s\n' "${FRONTEND_URL}"
    printf 'api_base_url=%s\n' "${API_BASE_URL}"
    printf 'backend_service=%s\n' "${BACKEND_SERVICE}"
    printf 'backend_port=%s\n' "${BACKEND_PORT}"
    printf 'nginx_target=%s\n' "${NGINX_TARGET}"
    printf 'nginx_source=%s\n' "${NGINX_SOURCE}"
    printf 'evidence_dir=%s\n' "${EVIDENCE_DIR}"
  } >"${EVIDENCE_DIR}/context.env"
}

log "Task 202 routing remediation started"
write_safe_context

capture readlink-current readlink -f "${RELEASE_DIR}"
capture release-list ls -la "${RELEASE_DIR}"
capture frontend-index ls -la "${RELEASE_DIR}/dist/index.html"
capture backend-server ls -la "${RELEASE_DIR}/backend/dist/server.js"
capture nginx-source ls -la "${NGINX_SOURCE}"
capture env-file-present sudo test -f "${ENV_FILE}"
capture_shell safe-env-values "sudo grep -E '^(NODE_ENV|PORT|API_PREFIX|CORS_ORIGIN|DB_ADAPTER|DATABASE_SSL)=' '${ENV_FILE}'"

capture_shell backend-env-guard "cd '${RELEASE_DIR}' && npm run backend:check-production-env"
capture backend-daemon-reload sudo systemctl daemon-reload
capture backend-enable sudo systemctl enable "${BACKEND_SERVICE}"
capture backend-restart sudo systemctl restart "${BACKEND_SERVICE}"
capture backend-is-active sudo systemctl is-active "${BACKEND_SERVICE}"
capture backend-status sudo systemctl status "${BACKEND_SERVICE}" --no-pager
capture backend-journal sudo journalctl -u "${BACKEND_SERVICE}" -n 120 --no-pager
capture_shell backend-port "ss -ltnp | grep ':${BACKEND_PORT}' || sudo lsof -iTCP:${BACKEND_PORT} -sTCP:LISTEN"
capture internal-health curl -sS "http://127.0.0.1:${BACKEND_PORT}/api/v1/health"
capture internal-ready curl -sS "http://127.0.0.1:${BACKEND_PORT}/api/v1/health/ready"

capture nginx-sites-enabled sudo ls -la /etc/nginx/sites-enabled
capture_shell nginx-server-names "sudo grep -R 'server_name' /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null || true"
capture_shell nginx-active-domain-before "sudo nginx -T 2>&1 | grep -n '${DOMAIN}' -C 8 || true"
capture_shell nginx-active-root-before "sudo nginx -T 2>&1 | grep -n '${RELEASE_DIR}/dist' -C 5 || true"
capture_shell nginx-active-api-before "sudo nginx -T 2>&1 | grep -n 'api/v1' -C 8 || true"

capture nginx-backup-dir sudo mkdir -p /etc/nginx/conf.d/backup-pharmsita
capture_shell nginx-backup-current "sudo cp -a '${NGINX_TARGET}' '/etc/nginx/conf.d/backup-pharmsita/pharmsita.conf.${RUN_ID}' 2>/dev/null || true"
capture nginx-apply-config sudo cp "${NGINX_SOURCE}" "${NGINX_TARGET}"
capture nginx-test sudo nginx -t

if [ "$(exit_code_for nginx-test)" = "0" ]; then
  capture nginx-reload sudo systemctl reload nginx
else
  log "SKIP nginx reload because nginx-test failed"
  printf 'skipped\n' >"${EVIDENCE_DIR}/nginx-reload.exit"
fi

capture nginx-status sudo systemctl status nginx --no-pager
capture_shell nginx-active-domain-after "sudo nginx -T 2>&1 | grep -n '${DOMAIN}' -C 8 || true"
capture_shell nginx-active-root-after "sudo nginx -T 2>&1 | grep -n '${RELEASE_DIR}/dist' -C 5 || true"
capture_shell nginx-active-api-after "sudo nginx -T 2>&1 | grep -n 'api/v1' -C 8 || true"
capture_shell nginx-active-backend-after "sudo nginx -T 2>&1 | grep -n '127.0.0.1:${BACKEND_PORT}' -C 5 || true"

capture public-root-head curl -I "${FRONTEND_URL}"
capture_shell public-root-body "curl -sS '${FRONTEND_URL}' | head"
capture public-health-head curl -I "${API_BASE_URL}/health"
capture public-health curl -sS "${API_BASE_URL}/health"
capture public-ready curl -sS "${API_BASE_URL}/health/ready"
capture_shell deploy-dry-run "cd '${RELEASE_DIR}' && npm run deploy:vps:dry-run -- --api-base-url '${API_BASE_URL}' --frontend-url '${FRONTEND_URL}' --allow-http --allow-degraded-readiness"

ROOT_STATUS="$(http_code "${FRONTEND_URL}")"
HEALTH_STATUS="$(http_code "${API_BASE_URL}/health")"
READY_STATUS="$(http_code "${API_BASE_URL}/health/ready")"
BACKEND_ACTIVE="$(exit_code_for backend-is-active)"
NGINX_TEST="$(exit_code_for nginx-test)"
DRY_RUN="$(exit_code_for deploy-dry-run)"

DECISION="BLOCKED"
if [ "${ROOT_STATUS}" = "200" ] &&
  [ "${HEALTH_STATUS}" = "200" ] &&
  [ "${BACKEND_ACTIVE}" = "0" ] &&
  [ "${NGINX_TEST}" = "0" ] &&
  [ "${DRY_RUN}" = "0" ]; then
  DECISION="GO"
fi

cat >"${EVIDENCE_DIR}/GO-NO-GO.md" <<EOF
# Task 202 VPS Routing Remediation Evidence

Decision: ${DECISION}
Run ID: ${RUN_ID}
Domain: ${DOMAIN}
Evidence directory: ${EVIDENCE_DIR}

| Gate | Actual | Required |
| --- | --- | --- |
| Frontend root | HTTP ${ROOT_STATUS} | HTTP 200 |
| API health | HTTP ${HEALTH_STATUS} | HTTP 200 |
| API readiness | HTTP ${READY_STATUS} | HTTP 200 or accepted staging warning |
| Backend active | exit ${BACKEND_ACTIVE} | exit 0 |
| Nginx test | exit ${NGINX_TEST} | exit 0 |
| Deployment dry-run | exit ${DRY_RUN} | exit 0 |

Do not share secret files. Send this folder after removing any accidental secret output.
EOF

cat >"${EVIDENCE_DIR}/evidence-manifest.json" <<EOF
{
  "task": 202,
  "runId": "${RUN_ID}",
  "domain": "${DOMAIN}",
  "frontendUrl": "${FRONTEND_URL}",
  "apiBaseUrl": "${API_BASE_URL}",
  "releaseDir": "${RELEASE_DIR}",
  "decision": "${DECISION}",
  "gates": {
    "frontendRootHttp": "${ROOT_STATUS}",
    "apiHealthHttp": "${HEALTH_STATUS}",
    "apiReadyHttp": "${READY_STATUS}",
    "backendActiveExit": "${BACKEND_ACTIVE}",
    "nginxTestExit": "${NGINX_TEST}",
    "deployDryRunExit": "${DRY_RUN}"
  }
}
EOF

log "Task 202 routing remediation completed with decision ${DECISION}"
log "Evidence directory: ${EVIDENCE_DIR}"
printf '\nEvidence directory: %s\nDecision: %s\n' "${EVIDENCE_DIR}" "${DECISION}"
