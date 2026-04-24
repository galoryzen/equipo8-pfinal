# -----------------------------------------------------------------------------
# ECS — Fargate Cluster + Task Definitions + Services
# -----------------------------------------------------------------------------

# --- Security Group for ECS Tasks ---

resource "aws_security_group" "ecs_tasks" {
  name_prefix = "${var.project_name}-ecs-"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Allow traffic from ALB"
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-ecs-sg" }
}

# --- Cluster ---

resource "aws_ecs_cluster" "main" {
  name = var.project_name

  setting {
    name  = "containerInsights"
    value = "disabled"
  }

  tags = { Name = "${var.project_name}-cluster" }
}

# --- CloudWatch Log Groups ---

resource "aws_cloudwatch_log_group" "services" {
  for_each = toset(var.services)

  name              = "/ecs/${var.project_name}/${each.key}"
  retention_in_days = 14
}

# --- DB schema mapping per service ---

locals {
  db_schemas = {
    auth         = "users"
    catalog      = "catalog"
    booking      = "booking"
    payment      = "payment"
    notification = "notification"
  }

  # Background workers — reuse the API image of `image_service` but run
  # `python -m app.worker` instead of uvicorn. No ALB / no CloudMap.
  workers = {
    "booking-worker" = {
      image_service = "booking"
      env = [
        { name = "BOOKING_EVENT_CONSUMER_BACKEND", value = "sqs" },
        { name = "BOOKING_EVENT_QUEUE_URL", value = aws_sqs_queue.worker["booking"].url },
        { name = "BOOKING_AWS_REGION", value = var.aws_region },
        { name = "BOOKING_SCHEDULER_ENABLED", value = "true" },
        { name = "BOOKING_CONSUMER_ENABLED", value = "true" },
      ]
    }
    "payment-worker" = {
      image_service = "payment"
      env = [
        { name = "PAYMENT_EVENT_CONSUMER_BACKEND", value = "sqs" },
        { name = "PAYMENT_EVENT_QUEUE_URL", value = aws_sqs_queue.worker["payment"].url },
        { name = "PAYMENT_AWS_REGION", value = var.aws_region },
        # PAYMENT_EVENT_PUBLISHER_BACKEND + EVENTBRIDGE_BUS_NAME come from the Dockerfile ENV.
      ]
    }
  }
}

# --- Task Definitions ---

resource "aws_ecs_task_definition" "services" {
  for_each = toset(var.services)

  family                   = "thub-${each.key}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = each.key
      image     = "${aws_ecr_repository.services[each.key].repository_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = 8000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "${upper(each.key)}_DATABASE_URL"
          value = "postgresql+asyncpg://${aws_db_instance.main.username}:${var.db_password}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
        },
        {
          name  = "${upper(each.key)}_DB_SCHEMA"
          value = local.db_schemas[each.key]
        },
        {
          name  = "${upper(each.key)}_REDIS_URL"
          value = "rediss://${aws_elasticache_serverless_cache.main.endpoint[0].address}:6379/0"
        },
        {
          name  = "${upper(each.key)}_DEBUG"
          value = "false"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}/${each.key}"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  # container_definitions is owned by the deploy-backend.yml pipeline, which
  # re-registers a new revision with the built image tag (:<sha>) on every
  # deploy. Terraform's copy is only the bootstrap template — ignore diffs so
  # plans stay clean and we don't churn revisions back to :latest.
  lifecycle {
    ignore_changes = [container_definitions]
  }
}

# --- Services ---

resource "aws_ecs_service" "services" {
  for_each = toset(var.services)

  name            = "thub-${each.key}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.services[each.key].arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.services[each.key].arn
    container_name   = each.key
    container_port   = 8000
  }

  service_registries {
    registry_arn = aws_service_discovery_service.services[each.key].arn
  }

  # task_definition is updated out-of-band by the deploy-backend.yml workflow.
  # desired_count may be changed by autoscaling in the future.
  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  depends_on = [aws_lb_listener.https]
}

# -----------------------------------------------------------------------------
# Background workers (SQS consumers + schedulers)
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "workers" {
  for_each = local.workers

  name              = "/ecs/${var.project_name}/${each.key}"
  retention_in_days = 14
}

resource "aws_ecs_task_definition" "workers" {
  for_each = local.workers

  family                   = "thub-${each.key}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name        = each.key
      image       = "${aws_ecr_repository.services[each.value.image_service].repository_url}:latest"
      essential   = true
      command     = ["python", "-m", "app.worker"]
      stopTimeout = 30

      environment = concat(
        [
          {
            name  = "${upper(each.value.image_service)}_DATABASE_URL"
            value = "postgresql+asyncpg://${aws_db_instance.main.username}:${var.db_password}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
          },
          {
            name  = "${upper(each.value.image_service)}_DB_SCHEMA"
            value = local.db_schemas[each.value.image_service]
          },
          {
            name  = "${upper(each.value.image_service)}_REDIS_URL"
            value = "rediss://${aws_elasticache_serverless_cache.main.endpoint[0].address}:6379/0"
          },
          {
            name  = "${upper(each.value.image_service)}_DEBUG"
            value = "false"
          },
        ],
        each.value.env,
      )

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}/${each.key}"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  # container_definitions is updated out-of-band by the pipeline (image tag).
  lifecycle {
    ignore_changes = [container_definitions]
  }
}

resource "aws_ecs_service" "workers" {
  for_each = local.workers

  name            = "thub-${each.key}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.workers[each.key].arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  # No load_balancer / service_registries — workers have no inbound HTTP.
  # desired_count stays at 1: booking-worker runs APScheduler (in-memory), so
  # N replicas would duplicate scheduled jobs.
  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }
}
