resource "aws_service_discovery_private_dns_namespace" "main" {
  name = "services.local"
  vpc  = aws_vpc.main.id

  tags = { Name = "${var.project_name}-namespace" }
}

resource "aws_service_discovery_service" "catalog" {
  name = "catalog"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}
