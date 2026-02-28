#!/usr/bin/env bash
set -euo pipefail

# Seed RDS with init.sql and seed.sql
# Usage: bash seed_rds.sh
# Requires: psql, terraform outputs available

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TF_DIR="$PROJECT_DIR/terraform"

RDS_ENDPOINT=$(terraform -chdir="$TF_DIR" output -raw rds_address)
DB_NAME="experimento2"
DB_USER="postgres"

echo "==> RDS endpoint: $RDS_ENDPOINT"
echo "==> Enter the RDS password when prompted."

echo "==> Running init.sql..."
psql "host=$RDS_ENDPOINT dbname=$DB_NAME user=$DB_USER sslmode=require" \
  -f "$PROJECT_DIR/db/init.sql"

echo "==> Running seed.sql..."
psql "host=$RDS_ENDPOINT dbname=$DB_NAME user=$DB_USER sslmode=require" \
  -f "$PROJECT_DIR/db/seed.sql"

echo "==> Database seeded successfully!"
