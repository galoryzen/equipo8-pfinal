# -----------------------------------------------------------------------------
# Variables — TravelHub Infrastructure
# -----------------------------------------------------------------------------

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "travelhub"
}

# --- Frontend ---

variable "frontend_domain" {
  description = "Custom domain for the frontend (CloudFront)"
  type        = string
  default     = "travelhub.galoryzen.xyz"
}

variable "hosted_zone_name" {
  description = "Route 53 hosted zone name"
  type        = string
  default     = "travelhub.galoryzen.xyz"
}

# --- Backend ---

variable "backend_domain" {
  description = "Custom domain for the backend API (ALB)"
  type        = string
  default     = "api.travelhub.galoryzen.xyz"
}

variable "services" {
  description = "List of backend microservices"
  type        = list(string)
  default     = ["auth", "catalog", "booking", "payment", "notification"]
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_password" {
  description = "RDS PostgreSQL master password"
  type        = string
  sensitive   = true
}

# --- GitHub Actions ---

variable "admin_ip" {
  description = "Admin IP CIDR for direct DB access (e.g. 1.2.3.4/32)"
  type        = string
  default     = "0.0.0.0/0"
}

variable "github_repo" {
  description = "GitHub repository (org/repo) for OIDC trust"
  type        = string
  default     = "galoryzen/equipo8-pfinal"
}
