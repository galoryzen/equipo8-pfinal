# -----------------------------------------------------------------------------
# Outputs — TravelHub Infrastructure
# -----------------------------------------------------------------------------

# --- Frontend ---

output "frontend_cloudfront_domain" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "frontend_cloudfront_distribution_id" {
  description = "CloudFront distribution ID (used for cache invalidation in CI)"
  value       = aws_cloudfront_distribution.frontend.id
}

output "frontend_s3_bucket" {
  description = "S3 bucket name for frontend static files"
  value       = aws_s3_bucket.frontend.id
}

output "frontend_url" {
  description = "Frontend URL"
  value       = "https://${var.frontend_domain}"
}

# --- Backend ---

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "ecr_repository_urls" {
  description = "ECR repository URLs per service"
  value       = { for k, v in aws_ecr_repository.services : k => v.repository_url }
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.main.endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_serverless_cache.main.endpoint[0].address
}

output "backend_url" {
  description = "Backend API URL"
  value       = "https://${var.backend_domain}"
}

# --- GitHub Actions ---

output "github_actions_role_arn" {
  description = "IAM Role ARN for GitHub Actions OIDC"
  value       = aws_iam_role.github_actions.arn
}

# --- Event bus + worker queues ---

output "event_bus_name" {
  description = "Custom EventBridge bus for domain events"
  value       = aws_cloudwatch_event_bus.main.name
}

output "event_bus_arn" {
  description = "ARN of the custom EventBridge bus"
  value       = aws_cloudwatch_event_bus.main.arn
}

output "worker_queue_urls" {
  description = "SQS queue URLs per worker (consumed by worker ECS task defs)"
  value       = { for k, v in aws_sqs_queue.worker : k => v.url }
}

output "worker_queue_arns" {
  description = "SQS queue ARNs per worker"
  value       = { for k, v in aws_sqs_queue.worker : k => v.arn }
}

output "worker_dlq_urls" {
  description = "SQS DLQ URLs per worker (ops visibility)"
  value       = { for k, v in aws_sqs_queue.worker_dlq : k => v.url }
}
