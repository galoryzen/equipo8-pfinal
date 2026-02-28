#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOCUSTFILE="$PROJECT_DIR/locustfile.py"
RESULTS_DIR="$PROJECT_DIR/results"

mkdir -p "$RESULTS_DIR"

SCENARIOS=(
    "10  2  3m"
    "25  5  3m"
    "50  10 3m"
    "100 20 3m"
)

for scenario in "${SCENARIOS[@]}"; do
    read -r USERS SPAWN DURATION <<< "$scenario"

    echo ""
    echo "============================================================"
    echo " Scenario: ${USERS} users | spawn ${SPAWN}/s | ${DURATION}"
    echo "============================================================"

    # 1. Reset database
    echo "==> Resetting database..."
    bash "$SCRIPT_DIR/reset_rds.sh"

    # 2. Wait for connections to stabilize
    echo "==> Waiting 10s for DB connections to stabilize..."
    sleep 10

    # 3. Run Locust headless
    PREFIX="$RESULTS_DIR/scenario_${USERS}"
    echo "==> Running Locust (headless)..."
    locust \
        -f "$LOCUSTFILE" \
        --headless \
        -u "$USERS" \
        -r "$SPAWN" \
        --run-time "$DURATION" \
        --csv "$PREFIX" \
        --html "${PREFIX}.html" \
        --only-summary

    echo "==> Scenario ${USERS} complete. Results in ${PREFIX}_*.csv and ${PREFIX}.html"
done

echo ""
echo "============================================================"
echo " All scenarios complete! Results in: $RESULTS_DIR/"
echo "============================================================"
