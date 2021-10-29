terraform {
  required_version = "~> 1.0"

  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "~> 3.58"
    }
    template = {
      source = "hashicorp/template"
      version = "~> 2.2"
    }
    auth0 = {
      source = "alexkappa/auth0"
      version = "~> 0.21"
    }
  }

  /*
  backend "remote" {
    organization = "amin-auth0"
    workspaces {
      name = "singpass-proxy"
    }
  }
  */

}

provider "aws" {
  profile = "default"
  region = var.region
}


provider "auth0" {
  domain = var.auth0_domain
  client_id = var.auth0_tf_client_id
  client_secret = var.auth0_tf_client_secret
  debug = "true"
}
