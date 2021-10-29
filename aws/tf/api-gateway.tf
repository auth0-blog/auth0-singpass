resource "aws_apigatewayv2_api" "api" {
  name = "Singpass Proxy"
  description = "Proxy for Singpass Exchange with ES256 support"
  protocol_type = "HTTP"

  cors_configuration {
    allow_credentials = false
    allow_headers = [
      "*"]
    allow_methods = [
      "*"]
    allow_origins = [
      "*"]
    expose_headers = [
      "*"]
    max_age = 3600
  }

}

resource "aws_cloudwatch_log_group" "api_logs" {
  name = "/api/logs"
  retention_in_days = 3
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_logs.arn
    format = jsonencode(
    {
      httpMethod     = "$context.httpMethod"
      ip             = "$context.identity.sourceIp"
      protocol       = "$context.protocol"
      requestId      = "$context.requestId"
      requestTime    = "$context.requestTime"
      responseLength = "$context.responseLength"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      errorMessage   = "$context.error.message"
      authorizerError = "$context.authorizer.error"
      integrationError = "$context.integration.error"
    }
    )
  }

  lifecycle {
    ignore_changes = [
      deployment_id,
      default_route_settings
    ]
  }
}


## token
resource "aws_apigatewayv2_integration" "post-token" {
  api_id           = aws_apigatewayv2_api.api.id
  integration_type = "AWS_PROXY"

  connection_type      = "INTERNET"
  description          = "This is our POST /token integration"
  integration_method   = "POST"
  integration_uri      = aws_lambda_function.post-token.invoke_arn
  passthrough_behavior = "WHEN_NO_MATCH"
  payload_format_version = "2.0"

  lifecycle {
    ignore_changes = [
      passthrough_behavior
    ]
  }
}

resource "aws_apigatewayv2_route" "post-token" {
  api_id             = aws_apigatewayv2_api.api.id
  route_key          = "POST /token"
  target             = "integrations/${aws_apigatewayv2_integration.post-token.id}"
}

resource "aws_lambda_permission" "invoke-post-token" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.post-token.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

## authorize
resource "aws_apigatewayv2_integration" "get-authorize" {
  api_id           = aws_apigatewayv2_api.api.id
  integration_type = "AWS_PROXY"

  connection_type      = "INTERNET"
  description          = "This is our GET /authorize integration"
  integration_method   = "POST"
  integration_uri      = aws_lambda_function.get-authorize.invoke_arn
  passthrough_behavior = "WHEN_NO_MATCH"
  payload_format_version = "2.0"

  lifecycle {
    ignore_changes = [
      passthrough_behavior
    ]
  }
}

resource "aws_apigatewayv2_route" "get-authorize" {
  api_id             = aws_apigatewayv2_api.api.id
  route_key          = "GET /authorize"
  target             = "integrations/${aws_apigatewayv2_integration.get-authorize.id}"
}

resource "aws_lambda_permission" "invoke-get-authorize" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get-authorize.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}
