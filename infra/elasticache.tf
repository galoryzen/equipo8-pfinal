# -----------------------------------------------------------------------------
# ElastiCache — Valkey Serverless (shared instance for all services)
# -----------------------------------------------------------------------------

resource "aws_security_group" "redis" {
  name_prefix = "${var.project_name}-redis-"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Valkey from ECS"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-redis-sg" }
}

resource "aws_elasticache_serverless_cache" "main" {
  engine               = "valkey"
  name                 = "${var.project_name}-redis"
  major_engine_version = "7"
  description          = "Valkey cache for ${var.project_name}"

  cache_usage_limits {
    data_storage {
      maximum = 1
      unit    = "GB"
    }
    ecpu_per_second {
      maximum = 1000
    }
  }

  security_group_ids = [aws_security_group.redis.id]
  subnet_ids         = aws_subnet.private[*].id

  # AWS CloudShell auto-attaches its own SG when you connect from the console.
  # Don't fight it — just ignore drift on this field.
  lifecycle {
    ignore_changes = [security_group_ids]
  }
}