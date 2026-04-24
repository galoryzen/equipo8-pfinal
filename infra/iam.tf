# -----------------------------------------------------------------------------
# IAM — ECS Task Roles
# -----------------------------------------------------------------------------

# --- Task Execution Role (used by ECS agent to pull images and push logs) ---

resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project_name}-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# --- Task Role (used by the application containers) ---

resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# --- EventBridge publish (API tasks publish domain events to the custom bus) ---

resource "aws_iam_policy" "ecs_task_events_publish" {
  name        = "${var.project_name}-ecs-task-events-publish"
  description = "Allow ECS tasks to publish domain events to the TravelHub bus"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "events:PutEvents"
        Resource = aws_cloudwatch_event_bus.main.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_events_publish" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.ecs_task_events_publish.arn
}

# --- SQS consume (worker tasks poll their inbox) ---
# Attached to the shared ecs_task role; API tasks simply never poll. DLQs are
# excluded — redrive is handled by SQS itself, not by the task.

resource "aws_iam_policy" "ecs_task_sqs_consume" {
  name        = "${var.project_name}-ecs-task-sqs-consume"
  description = "Allow ECS worker tasks to receive and delete messages from their SQS inboxes"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility",
        ]
        Resource = [for q in aws_sqs_queue.worker : q.arn]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_sqs_consume" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.ecs_task_sqs_consume.arn
}

# --- SES send (notification worker sends booking confirmation emails) ---
# Scoped via ses:FromAddress so the shared task role can only send as the
# single verified noreply@ identity — not as any identity in the account.

resource "aws_iam_policy" "ecs_task_ses_send" {
  name        = "${var.project_name}-ecs-task-ses-send"
  description = "Allow ECS tasks to send emails via SES from the verified address"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ses:FromAddress" = var.ses_from_address
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_ses_send" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.ecs_task_ses_send.arn
}
