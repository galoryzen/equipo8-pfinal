data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# ─── ECS Cluster ──────────────────────────────────────
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"
}

# ─── CloudWatch Log Groups ───────────────────────────
resource "aws_cloudwatch_log_group" "catalog" {
  name              = "/ecs/${var.project_name}/catalog"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "booking" {
  name              = "/ecs/${var.project_name}/booking"
  retention_in_days = 7
}

# ─── Catalog Task Definition ─────────────────────────
locals {
  db_url = "postgresql+asyncpg://${var.db_username}:${urlencode(var.db_password)}@${aws_db_instance.main.endpoint}/${var.db_name}?ssl=require"

  catalog_image = var.catalog_image != "" ? var.catalog_image : "${aws_ecr_repository.catalog.repository_url}:latest"
  booking_image = var.booking_image != "" ? var.booking_image : "${aws_ecr_repository.booking.repository_url}:latest"
}

resource "aws_ecs_task_definition" "catalog" {
  family                   = "${var.project_name}-catalog"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "catalog"
    image = local.catalog_image

    portMappings = [{
      containerPort = 8000
      protocol      = "tcp"
    }]

    environment = [
      { name = "DATABASE_URL", value = local.db_url },
      { name = "DB_POOL_SIZE", value = "20" },
      { name = "DB_MAX_OVERFLOW", value = "10" },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.catalog.name
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = "catalog"
      }
    }
  }])
}

resource "aws_ecs_service" "catalog" {
  name            = "${var.project_name}-catalog"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.catalog.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.catalog.arn
    container_name   = "catalog"
    container_port   = 8000
  }

  service_registries {
    registry_arn = aws_service_discovery_service.catalog.arn
  }

  depends_on = [aws_lb_listener.http]
}

# ─── Booking Task Definition ─────────────────────────
resource "aws_ecs_task_definition" "booking" {
  family                   = "${var.project_name}-booking"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "booking"
    image = local.booking_image

    portMappings = [{
      containerPort = 8000
      protocol      = "tcp"
    }]

    environment = [
      { name = "DATABASE_URL", value = local.db_url },
      { name = "DB_POOL_SIZE", value = "10" },
      { name = "DB_MAX_OVERFLOW", value = "5" },
      { name = "CATALOG_SERVICE_URL", value = "http://catalog.services.local:8000" },
      { name = "CATALOG_TIMEOUT_SECONDS", value = "0.5" },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.booking.name
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = "booking"
      }
    }
  }])
}

resource "aws_ecs_service" "booking" {
  name            = "${var.project_name}-booking"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.booking.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.booking.arn
    container_name   = "booking"
    container_port   = 8000
  }

  depends_on = [aws_lb_listener.http]
}
