resource "aws_ecr_repository" "catalog" {
  name                 = "${var.project_name}-catalog"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = false
  }
}

resource "aws_ecr_repository" "booking" {
  name                 = "${var.project_name}-booking"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = false
  }
}
