# -----------------------------------------------------------------------------
# CloudFront Distribution — Frontend CDN
# -----------------------------------------------------------------------------

# Referencia al certificado ACM wildcard existente (us-east-1)
data "aws_acm_certificate" "wildcard" {
  domain      = "*.travelhub.galoryzen.xyz"
  statuses    = ["ISSUED"]
  most_recent = true
}

# Referencia a la hosted zone existente en Route 53
data "aws_route53_zone" "main" {
  name = var.hosted_zone_name
}

# Origin Access Control para S3
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.project_name}-frontend-oac"
  description                       = "OAC for ${var.project_name} frontend S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Function: rewrite directory-style URIs to /index.html so
# Next.js static export (trailingSlash: true) resolves correctly through OAC.
resource "aws_cloudfront_function" "rewrite_uri" {
  name    = "${var.project_name}-rewrite-uri"
  runtime = "cloudfront-js-2.0"
  comment = "Appends index.html for trailing-slash and extensionless paths"
  publish = true
  code    = file("${path.module}/cloudfront_rewrite.js")
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.frontend_domain]
  price_class         = "PriceClass_100" # NA + EU only (cheaper)
  comment             = "${var.project_name} frontend"

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "s3-frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id          = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized
    origin_request_policy_id = "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf" # CORS-S3Origin

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite_uri.arn
    }
  }

  # SPA fallback: 403/404 del S3 → devolver index.html para client-side routing
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  viewer_certificate {
    acm_certificate_arn      = data.aws_acm_certificate.wildcard.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Name    = "${var.project_name}-frontend-cdn"
    Project = var.project_name
  }
}

# DNS Record — apuntar dominio frontend a CloudFront
resource "aws_route53_record" "frontend" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.frontend_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}
