output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "ecr_catalog_url" {
  description = "ECR repository URL for catalog service"
  value       = aws_ecr_repository.catalog.repository_url
}

output "ecr_booking_url" {
  description = "ECR repository URL for booking service"
  value       = aws_ecr_repository.booking.repository_url
}

output "rds_address" {
  description = "RDS instance address (host only)"
  value       = aws_db_instance.main.address
}
