variable "region" {
  default = "ap-southeast-2"
}

variable "auth0_domain" {
  type = string
  description = "Auth0 Domain"
}

variable "auth0_custom_domain" {
  type = string
  description = "Auth0 custom domain name"
}

variable "auth0_tf_client_id" {
  type = string
  description = "Auth0 TF provider client_id"
}

variable "auth0_tf_client_secret" {
  type = string
  description = "Auth0 TF provider client_secret"
  sensitive = true
}

variable "lambda_bucket" {
  type = string
  description = "Lambda bucket"
}

variable "lambda_version" {
  type = string
  description = "token lambda version"
}

variable "private_key" {
  type = string
  description = "private key for client assertion in JWK format"
  sensitive = true
}

variable "singpass_client_id" {
  type = string
  description = "singpass client_id"
}

variable "singpass_authorization_endpoint" {
  type = string
  description = "singpass authorization endpoint"
  default = "https://stg-id.singpass.gov.sg/authorize"
}

variable "singpass_token_endpoint" {
  type = string
  description = "singpass authorization token endpoint"
  default = "https://stg-id.singpass.gov.sg/token"
}

variable "singpass_environment" {
  type = string
  description = "singpass stg/prod endpoint. staging is stg-id and prod is id"
  default = "https://stg-id.singpass.gov.sg"
}



