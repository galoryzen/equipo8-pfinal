variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS CLI profile name"
  type        = string
  default     = "default"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "exp2"
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "RDS database name"
  type        = string
  default     = "experimento2"
}

variable "catalog_image" {
  description = "Catalog service Docker image URI (after push to ECR)"
  type        = string
  default     = ""
}

variable "booking_image" {
  description = "Booking service Docker image URI (after push to ECR)"
  type        = string
  default     = ""
}
