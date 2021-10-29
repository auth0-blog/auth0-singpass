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

variable "private_key" {
  type = string
  description = "private key in JWK format for client assertion"
  sensitive = true
}

variable "singpass_client_id" {
  type = string
  description = "singpass client_id"
}

variable "singpass_client_secret" {
  type = string
  description = "singpass client_secret"
  sensitive = true
}

variable "singpass_authorization_endpoint" {
  type = string
  description = "singpass authorization endpoint"
  default = "https://stg-id.singpass.gov.sg/authorize"
}

variable "singpass_environment" {
  type = string
  description = "singpass stg/prod endpoint. staging is stg-id and prod is id"
  default = "https://stg-id.singpass.gov.sg"
}

variable "singpass_token_endpoint" {
  type = string
  description = "singpass authorization token endpoint"
  default = "https://stg-id.singpass.gov.sg/token"
}

## cloudflare
variable "cloudflare_email" {
  type = string
  description = "cloudflare email"
}

variable "cloudflare_account_id" {
  type = string
  description = "cloudflare account_id"
}

variable "cloudflare_api_key" {
  type = string
  description = "cloudflare api key"
  sensitive = true
}

variable "cloudflare_zone_id" {
  type = string
  description = "cloudflare zone id"
}
