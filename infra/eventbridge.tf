# -----------------------------------------------------------------------------
# EventBridge — Custom domain event bus + rules + targets
# -----------------------------------------------------------------------------
#
# The bus name matches DEFAULT_EXCHANGE in backend/libs/shared/events/rabbitmq.py
# so local (RabbitMQ) and prod (EventBridge) use the same topic string.
#
# Rules: one per event type (matched via `detail-type`).
# Targets: N:M between rules and worker queues (see local.worker_queues in
# sqs.tf). A rule with no matching worker produces no targets and becomes a
# no-op today (e.g. BookingConfirmed, reserved for notification worker).
#

locals {
  event_bus_name = "thub.domain.events"

  event_rules = toset([
    "PaymentRequested",
    "PaymentSucceeded",
    "PaymentFailed",
    "BookingRejected",
    "BookingConfirmed",
  ])

  # event_type -> [worker keys] derived from local.worker_queues (sqs.tf)
  rule_targets = {
    for evt in local.event_rules :
    evt => [for k, v in local.worker_queues : k if contains(v.events, evt)]
  }

  # Flatten to a map keyed by "<event>__<worker>" for for_each on targets
  targets_flat = merge([
    for evt, workers in local.rule_targets : {
      for w in workers : "${evt}__${w}" => { event = evt, worker = w }
    }
  ]...)
}

# --- Custom event bus ---

resource "aws_cloudwatch_event_bus" "main" {
  name = local.event_bus_name

  tags = { Name = "${var.project_name}-event-bus" }
}

# --- Rules (one per event type) ---

resource "aws_cloudwatch_event_rule" "by_event" {
  for_each = local.event_rules

  name           = "${var.project_name}-rule-${lower(each.value)}"
  event_bus_name = aws_cloudwatch_event_bus.main.name
  event_pattern  = jsonencode({ "detail-type" = [each.value] })

  tags = { Name = "${var.project_name}-rule-${lower(each.value)}" }
}

# --- Targets: route each rule to every worker queue that consumes it ---

resource "aws_cloudwatch_event_target" "by_event_queue" {
  for_each = local.targets_flat

  rule           = aws_cloudwatch_event_rule.by_event[each.value.event].name
  event_bus_name = aws_cloudwatch_event_bus.main.name
  target_id      = "${each.value.worker}-worker"
  arn            = aws_sqs_queue.worker[each.value.worker].arn

  # No input_transformer: deliver the full EventBridge envelope so the
  # SqsEventConsumer can parse `detail-type` + `detail` uniformly.
}
