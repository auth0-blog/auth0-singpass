terraform {
  required_version = "~> 1.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 3.0"
    }
    template   = {
      source  = "hashicorp/template"
      version = "~> 2.2"
    }
    auth0      = {
      source  = "alexkappa/auth0"
      version = "~> 0.21"
    }
    http       = {
      source  = "hashicorp/http"
      version = "2.1.0"
    }
  }
}


provider "cloudflare" {
  email      = var.cloudflare_email
  account_id = var.cloudflare_account_id
  api_key    = var.cloudflare_api_key
}

provider "auth0" {
  domain        = var.auth0_domain
  client_id     = var.auth0_tf_client_id
  client_secret = var.auth0_tf_client_secret
  debug         = "true"
}
