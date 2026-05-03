#!/usr/bin/env bash
# =============================================================================
# Seed RDS via SSH tunnel through fck-nat bastion
# Usage: ./scripts/seed-rds.sh
# Requires: psql, ssh key at ~/.ssh/travelhub-bastion
# =============================================================================
set -euo pipefail

export AWS_PROFILE="${AWS_PROFILE:-personal}"

BASTION_KEY="$HOME/.ssh/travelhub-bastion"
BASTION_USER="ec2-user"
LOCAL_PORT=15432
DB_NAME="travelhub"
DB_USER="travelhub"
DB_DIR="$(cd "$(dirname "$0")/../backend/db" && pwd)"
DANE_CSV="$(cd "$(dirname "$0")/.." && pwd)/dane.csv"

# --- Resolve bastion IP from AWS ---
echo "→ Resolving bastion IP..."
BASTION_IP=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=travelhub-fck-nat" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

if [ "$BASTION_IP" = "None" ] || [ -z "$BASTION_IP" ]; then
  echo "✗ Could not find bastion IP. Is fck-nat running?"
  exit 1
fi
echo "  Bastion: $BASTION_IP"

# --- Resolve RDS endpoint from terraform output ---
echo "→ Resolving RDS endpoint..."
RDS_ENDPOINT=$(cd "$(dirname "$0")/../infra" && terraform output -raw rds_endpoint 2>/dev/null | grep -oE '[A-Za-z0-9.-]+:[0-9]+' | head -n1)
if [ -z "$RDS_ENDPOINT" ]; then
  echo "✗ Could not resolve RDS endpoint from terraform output."
  exit 1
fi
RDS_HOST="${RDS_ENDPOINT%%:*}"
RDS_PORT="${RDS_ENDPOINT##*:}"
echo "  RDS: $RDS_HOST:$RDS_PORT"

# --- Prompt for DB password ---
read -rsp "→ Enter RDS password for $DB_USER: " DB_PASSWORD
echo ""

# --- Open SSH tunnel in background ---
echo "→ Opening SSH tunnel (localhost:$LOCAL_PORT → RDS)..."
ssh -i "$BASTION_KEY" -f -N -L "$LOCAL_PORT:$RDS_HOST:$RDS_PORT" "$BASTION_USER@$BASTION_IP"
TUNNEL_PID=$(lsof -ti tcp:$LOCAL_PORT -sTCP:LISTEN 2>/dev/null || true)

cleanup() {
  if [ -n "${TUNNEL_PID:-}" ]; then
    echo "→ Closing SSH tunnel (PID $TUNNEL_PID)..."
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

export PGPASSWORD="$DB_PASSWORD"

echo "→ Dropping existing schemas and enums..."
psql -h localhost -p "$LOCAL_PORT" -U "$DB_USER" -d "$DB_NAME" <<'SQL'
DROP SCHEMA IF EXISTS users, catalog, booking, payments, notifications CASCADE;
DROP TYPE IF EXISTS
    user_role, partner_status,
    cancellation_policy_type, property_status, room_type_status, policy_category,
    booking_status,
    payment_status,
    notification_channel, notification_status
CASCADE;
SQL

echo "→ Running 01-init.sql..."
psql -h localhost -p "$LOCAL_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$DB_DIR/01-init.sql"

echo "→ Loading cities from dane.csv..."
psql -h localhost -p "$LOCAL_PORT" -U "$DB_USER" -d "$DB_NAME" <<SQL
CREATE TEMP TABLE dane_raw (
    codigo          VARCHAR,
    codigo_municipio VARCHAR,
    continente      VARCHAR,
    pais            VARCHAR,
    departamento    VARCHAR,
    municipio       VARCHAR
);

\\copy dane_raw (codigo, codigo_municipio, continente, pais, departamento, municipio) FROM '$DANE_CSV' WITH (FORMAT csv, HEADER true)

INSERT INTO catalog.city (dane_code, name, department, country, continent)
SELECT codigo, INITCAP(municipio), INITCAP(departamento), INITCAP(pais), INITCAP(continente)
FROM dane_raw;

DROP TABLE dane_raw;
SQL

echo "→ Running 03-seed.sql..."
psql -h localhost -p "$LOCAL_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$DB_DIR/03-seed.sql"

echo "✓ Done! Database seeded successfully."