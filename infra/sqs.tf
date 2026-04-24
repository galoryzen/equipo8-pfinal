# -----------------------------------------------------------------------------
# SQS — Worker inboxes for EventBridge fan-out
# -----------------------------------------------------------------------------
#
# One queue per worker service (not per event type). Each worker polls a single
# inbox and demultiplexes event types internally via SqsEventConsumer's handler
# map. Adding a new event type a worker consumes only requires editing the
# `events` list here (and the corresponding EventBridge rule in eventbridge.tf).
#

locals {
  worker_queues = {
    booking = {
      events = ["PaymentSucceeded", "PaymentFailed"]
    }
    payment = {
      events = ["PaymentRequested", "BookingRejected"]
    }
  }
}

# --- Dead-letter queues ---

resource "aws_sqs_queue" "worker_dlq" {
  for_each = local.worker_queues

  name                       = "thub-${each.key}-worker-dlq"
  message_retention_seconds  = 1209600 # 14 days
  visibility_timeout_seconds = 60

  tags = { Name = "thub-${each.key}-worker-dlq" }
}

# --- Main worker queues ---

resource "aws_sqs_queue" "worker" {
  for_each = local.worker_queues

  name                       = "thub-${each.key}-worker"
  message_retention_seconds  = 1209600 # 14 days
  visibility_timeout_seconds = 60
  receive_wait_time_seconds  = 20 # long-poll parity with consumer

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.worker_dlq[each.key].arn
    maxReceiveCount     = 5
  })

  tags = { Name = "thub-${each.key}-worker" }
}

# --- Queue policies: allow EventBridge to SendMessage, scoped to rule ARNs ---

data "aws_iam_policy_document" "worker_queue" {
  for_each = local.worker_queues

  statement {
    sid    = "AllowEventBridgeSendMessage"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }

    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.worker[each.key].arn]

    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values = [
        for evt in each.value.events :
        aws_cloudwatch_event_rule.by_event[evt].arn
      ]
    }
  }
}

resource "aws_sqs_queue_policy" "worker" {
  for_each = local.worker_queues

  queue_url = aws_sqs_queue.worker[each.key].url
  policy    = data.aws_iam_policy_document.worker_queue[each.key].json
}
