#!/bin/bash
set -e

REGION="us-east-1"
PROFILE="personal"
CLUSTER="travelhub"
SERVICES=("thub-auth" "thub-catalog" "thub-booking" "thub-payment" "thub-notification")
DB_INSTANCE="travelhub-db"
NAT_INSTANCE_NAME="travelhub-fck-nat"

echo "Starting fck-nat instance..."
NAT_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=$NAT_INSTANCE_NAME" "Name=instance-state-name,Values=stopped" \
  --query "Reservations[0].Instances[0].InstanceId" --output text \
  --region $REGION --profile $PROFILE)
if [ "$NAT_ID" != "None" ] && [ -n "$NAT_ID" ]; then
  aws ec2 start-instances --instance-ids $NAT_ID --region $REGION --profile $PROFILE > /dev/null
  echo "  Waiting for fck-nat to start..."
  aws ec2 wait instance-running --instance-ids $NAT_ID --region $REGION --profile $PROFILE
  echo "  $NAT_ID running."
else
  echo "  fck-nat already running."
fi

echo "Starting RDS..."
aws rds start-db-instance --db-instance-identifier $DB_INSTANCE \
  --region $REGION --profile $PROFILE > /dev/null 2>&1 || echo "  RDS already running"
echo "  Waiting for RDS to be available (this may take a few minutes)..."
aws rds wait db-instance-available --db-instance-identifier $DB_INSTANCE \
  --region $REGION --profile $PROFILE
echo "  RDS ready."

echo "Starting ECS services..."
for svc in "${SERVICES[@]}"; do
  aws ecs update-service --cluster $CLUSTER --service $svc --desired-count 1 \
    --region $REGION --profile $PROFILE > /dev/null
  echo "  $svc → desired-count=1"
done

echo "Waiting for services to stabilize..."
for svc in "${SERVICES[@]}"; do
  aws ecs wait services-stable --cluster $CLUSTER --services $svc \
    --region $REGION --profile $PROFILE
  echo "  $svc stable."
done

echo ""
echo "Environment is up and running."