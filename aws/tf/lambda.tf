locals {
  lambda-name = "singpass-token"
  authorize-lambda-name = "singpass-authorize"
}

resource "aws_iam_role" "lambda_exec" {
  name = "singpass_lambda_role"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_policy" "lambda_logging" {
  name = "singpass_lambda_policy"
  path = "/"
  description = "IAM policy for logging from a lambda"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*",
      "Effect": "Allow"
    },
    {
      "Action": [
        "ec2:CreateNetworkInterface",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DeleteNetworkInterface"
      ],
      "Resource": "*",
      "Effect": "Allow"
    },
    {
      "Effect": "Allow",
      "Action": [
          "secretsmanager:GetResourcePolicy",
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:ListSecretVersionIds",
          "secretsmanager:ListSecrets"
      ],
      "Resource": [
          "${aws_secretsmanager_secret_version.companion_app_client_secret.arn}",
          "${aws_secretsmanager_secret_version.private_key.arn}"
      ]
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_logging.arn
}

## token
resource "aws_cloudwatch_log_group" "post-token" {
  name              = "/aws/lambda/${local.lambda-name}"
  retention_in_days = 3
}

resource "aws_lambda_function" "post-token" {
  function_name = local.lambda-name

  s3_bucket = var.lambda_bucket
  s3_key = "lambda-singpass-token-${var.lambda_version}.zip"

  handler = "token/app.handler"
  runtime = "nodejs14.x"

  role = aws_iam_role.lambda_exec.arn
  timeout = 20

  depends_on = [
    aws_iam_role_policy_attachment.lambda_logs,
    aws_cloudwatch_log_group.post-token,
  ]

  environment {
    variables = {
      REGION                            = var.region
      AUTH0_DOMAIN                      = var.auth0_domain
      TOKEN_ENDPOINT                    = var.singpass_token_endpoint
      AUTH0_COMPANION_CLIENT_ID         = auth0_client.comp_app_client.client_id
      SINGPASS_CLIENT_ID                = var.singpass_client_id
      SINGPASS_ENVIRONMENT              = var.singpass_environment
      PRIVATE_KEY_ARN                   = aws_secretsmanager_secret_version.private_key.arn
      AUTH0_COMPANION_CLIENT_SECRET_ARN = aws_secretsmanager_secret_version.companion_app_client_secret.arn
      NODE_OPTIONS                      = "--enable-source-maps"
    }
  }
}

## authorize
resource "aws_cloudwatch_log_group" "get-authorize" {
  name              = "/aws/lambda/${local.authorize-lambda-name}"
  retention_in_days = 3
}

resource "aws_lambda_function" "get-authorize" {
  function_name = local.authorize-lambda-name

  s3_bucket = var.lambda_bucket
  s3_key    = "lambda-singpass-authorize-${var.lambda_version}.zip"

  handler = "authorize/app.handler"
  runtime = "nodejs14.x"

  role    = aws_iam_role.lambda_exec.arn
  timeout = 20

  depends_on = [
    aws_iam_role_policy_attachment.lambda_logs,
    aws_cloudwatch_log_group.get-authorize,
  ]

  environment {
    variables = {
      AUTH0_CUSTOM_DOMAIN = var.auth0_custom_domain
      NODE_OPTIONS        = "--enable-source-maps"
    }
  }
}


## SM
resource "aws_secretsmanager_secret" "companion_app_client_secret" {
  name                    = "AUTH0_COMPANION_CLIENT_SECRET"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "companion_app_client_secret" {
  secret_id     = aws_secretsmanager_secret.companion_app_client_secret.id
  secret_string = auth0_client.comp_app_client.client_secret
}

resource "aws_secretsmanager_secret" "private_key" {
  name                    = "PRIVATE_KEY"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "private_key" {
  secret_id     = aws_secretsmanager_secret.private_key.id
  secret_string = var.private_key
}



