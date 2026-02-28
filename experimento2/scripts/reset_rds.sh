#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TF_DIR="$PROJECT_DIR/terraform"

RDS_ENDPOINT=$(terraform -chdir="$TF_DIR" output -raw rds_address)
DB_NAME="experimento2"
DB_USER="postgres"

# Read password from terraform.tfvars
export PGPASSWORD
PGPASSWORD=$(grep 'db_password' "$TF_DIR/terraform.tfvars" | sed 's/.*= *"\(.*\)"/\1/')

echo "==> RDS endpoint: $RDS_ENDPOINT"
echo "==> Dropping schemas..."
psql "host=$RDS_ENDPOINT dbname=$DB_NAME user=$DB_USER sslmode=require" \
  -c "DROP SCHEMA IF EXISTS catalog CASCADE; DROP SCHEMA IF EXISTS booking CASCADE;"

echo "==> Running init.sql..."
psql "host=$RDS_ENDPOINT dbname=$DB_NAME user=$DB_USER sslmode=require" \
  -f "$PROJECT_DIR/db/init.sql"

echo "==> Running seed.sql..."
psql "host=$RDS_ENDPOINT dbname=$DB_NAME user=$DB_USER sslmode=require" \
  -f "$PROJECT_DIR/db/seed.sql"

echo "==> Database reset complete!"
