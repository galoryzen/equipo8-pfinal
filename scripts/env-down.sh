#!/bin/bash
set -e

REGION="us-east-1"
PROFILE="personal"
CLUSTER="travelhub"
SERVICES=("thub-auth" "thub-catalog" "thub-booking" "thub-payment" "thub-notification")
DB_INSTANCE="travelhub-db"
NAT_INSTANCE_NAME="travelhub-fck-nat"

echo "Stopping ECS services..."
for svc in "${SERVICES[@]}"; do
  aws ecs update-service --cluster $CLUSTER --service $svc --desired-count 0 \
    --region $REGION --profile $PROFILE > /dev/null
  echo "  $svc → desired-count=0"
done

echo "Stopping RDS (auto-restarts after 7 days)..."
aws rds stop-db-instance --db-instance-identifier $DB_INSTANCE \
  --region $REGION --profile $PROFILE > /dev/null 2>&1 || echo "  RDS already stopped or stopping"
echo "  RDS stopping."

echo "Stopping fck-nat instance..."
NAT_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=$NAT_INSTANCE_NAME" "Name=instance-state-name,Values=running" \
  --query "Reservations[0].Instances[0].InstanceId" --output text \
  --region $REGION --profile $PROFILE)
if [ "$NAT_ID" != "None" ] && [ -n "$NAT_ID" ]; then
  aws ec2 stop-instances --instance-ids $NAT_ID --region $REGION --profile $PROFILE > /dev/null
  echo "  $NAT_ID stopped."
else
  echo "  fck-nat already stopped."
fi

echo ""
echo "Environment shut down."