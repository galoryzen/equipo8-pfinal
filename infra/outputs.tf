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

output "backend_url" {
  description = "Backend API URL"
  value       = "https://${var.backend_domain}"
}

# --- GitHub Actions ---

output "github_actions_role_arn" {
  description = "IAM Role ARN for GitHub Actions OIDC"
  value       = aws_iam_role.github_actions.arn
}
