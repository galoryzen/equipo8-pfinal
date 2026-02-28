#!/usr/bin/env bash
set -euo pipefail

# Build and push Docker images to ECR
# Usage: bash build_and_push.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TF_DIR="$PROJECT_DIR/terraform"

# Get outputs from Terraform
CATALOG_REPO=$(terraform -chdir="$TF_DIR" output -raw ecr_catalog_url)
BOOKING_REPO=$(terraform -chdir="$TF_DIR" output -raw ecr_booking_url)
REGION=$(aws configure get region 2>/dev/null || echo "us-east-1")
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "==> Logging in to ECR..."
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

echo "==> Building catalog service..."
docker build -t "$CATALOG_REPO:latest" "$PROJECT_DIR/services/catalog"

echo "==> Building booking service..."
docker build -t "$BOOKING_REPO:latest" "$PROJECT_DIR/services/booking"

echo "==> Pushing catalog image..."
docker push "$CATALOG_REPO:latest"

echo "==> Pushing booking image..."
docker push "$BOOKING_REPO:latest"

echo "==> Done! Images pushed to ECR."
echo "    Catalog: $CATALOG_REPO:latest"
echo "    Booking: $BOOKING_REPO:latest"
