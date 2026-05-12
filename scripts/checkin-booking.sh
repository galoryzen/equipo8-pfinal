#!/usr/bin/env bash
# Trigger the hotel check-in endpoint for a booking, simulating the hotel staff
# scan of the traveler's QR code. Logs in as the seed admin user (ADMIN role
# can call /check-in across all hotels without needing a hotel-scoped JWT).
#
# Usage: ./scripts/checkin-booking.sh <booking_id>
#
# Overrides (env vars):
#   EMAIL=...          Pin to a different login (e.g. a hotel manager).
#   PASSWORD=...       Override the password (default: travelhub seed).
#   GATEWAY=http://... Hit a non-local backend.

set -euo pipefail

BOOKING_ID="${1:-}"
GATEWAY="${GATEWAY:-http://localhost:8080}"
EMAIL="${EMAIL:-admin@travelhub.com}"
PASSWORD="${PASSWORD:-travelhub}"

if [[ -z "$BOOKING_ID" ]]; then
  echo "Usage: $0 <booking_id>" >&2
  exit 64
fi

echo "Login: $EMAIL"

TOKEN="$(curl -sf -X POST "$GATEWAY/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["token"])')"

if [[ -z "$TOKEN" ]]; then
  echo "Login failed for $EMAIL" >&2
  exit 3
fi

NOW="$(python3 -c 'from datetime import datetime, timezone; print(datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))')"
echo "actual_arrival_at: $NOW"

curl -sS -i -X POST "$GATEWAY/api/v1/booking/bookings/$BOOKING_ID/check-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"actual_arrival_at\":\"$NOW\"}"
echo
