# -----------------------------------------------------------------------------
# SES — Email sending identity for booking confirmation notifications
# -----------------------------------------------------------------------------
#
# Sandbox mode: only verified recipient identities receive email. Add more
# recipients via var.ses_test_recipients until we request production access.
#
# Domain verification is fully automated via Route53: DKIM CNAMEs, MAIL FROM
# MX + SPF TXT are published to the same hosted zone already managed here.
#

# --- Domain identity ---

resource "aws_ses_domain_identity" "main" {
  domain = var.hosted_zone_name
}

resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

resource "aws_route53_record" "ses_dkim" {
  count = 3

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${aws_ses_domain_dkim.main.dkim_tokens[count.index]}._domainkey"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.main.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

resource "aws_ses_domain_identity_verification" "main" {
  domain = aws_ses_domain_identity.main.id

  depends_on = [aws_route53_record.ses_dkim]
}

# --- Custom MAIL FROM (SPF alignment + better deliverability) ---

resource "aws_ses_domain_mail_from" "main" {
  domain           = aws_ses_domain_identity.main.domain
  mail_from_domain = var.ses_mail_from_subdomain

  behavior_on_mx_failure = "UseDefaultValue"
}

resource "aws_route53_record" "ses_mail_from_mx" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = aws_ses_domain_mail_from.main.mail_from_domain
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.${var.aws_region}.amazonses.com"]
}

resource "aws_route53_record" "ses_mail_from_txt" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = aws_ses_domain_mail_from.main.mail_from_domain
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}

# --- Sandbox recipient identities ---

resource "aws_ses_email_identity" "test_recipients" {
  for_each = toset(var.ses_test_recipients)

  email = each.value
}
