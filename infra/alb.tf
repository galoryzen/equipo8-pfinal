# -----------------------------------------------------------------------------
# ALB — Application Load Balancer + Path-based routing
# -----------------------------------------------------------------------------

# Uses the wildcard ACM certificate defined in cloudfront.tf
# data.aws_acm_certificate.wildcard covers *.travelhub.galoryzen.xyz

# --- Security Group ---

resource "aws_security_group" "alb" {
  name_prefix = "${var.project_name}-alb-"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-alb-sg" }
}

# --- ALB ---

resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = { Name = "${var.project_name}-alb" }
}

# --- Listeners ---

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = data.aws_acm_certificate.wildcard.arn

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "application/json"
      message_body = "{\"error\": \"not found\"}"
      status_code  = "404"
    }
  }
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# --- Target Groups (one per service) ---

resource "aws_lb_target_group" "services" {
  for_each = toset(var.services)

  name        = "thub-${each.key}"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/api/v1/${each.key == "notification" ? "notifications" : each.key}/health"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = { Name = "${var.project_name}-tg-${each.key}" }
}

# --- Listener Rules (path-based routing) ---

locals {
  service_paths = {
    auth         = "/api/v1/auth/*"
    catalog      = "/api/v1/catalog/*"
    booking      = "/api/v1/booking/*"
    payment      = "/api/v1/payment/*"
    notification = "/api/v1/notifications/*"
  }
}

resource "aws_lb_listener_rule" "services" {
  for_each = local.service_paths

  listener_arn = aws_lb_listener.https.arn
  priority     = index(var.services, each.key) + 1

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services[each.key].arn
  }

  condition {
    path_pattern {
      values = [each.value]
    }
  }
}

# --- DNS Record ---

resource "aws_route53_record" "backend" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.backend_domain
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
