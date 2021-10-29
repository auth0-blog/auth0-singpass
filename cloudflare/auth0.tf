resource "auth0_tenant" "tenant_config" {
  friendly_name = "Singpass Staging PoC"
  flags {
    enable_client_connections = false
  }
}

resource "auth0_client" "sample_client" {
  name = "Singpass CF jwt.io client"
  description = "client to singpass federation test"
  app_type = "spa"
  oidc_conformant = true
  is_first_party = true

  callbacks = [
    "https://jwt.io"
  ]

  jwt_configuration {
    alg = "RS256"
  }
}

data "template_file" "fetchUserProfile" {
  template = file("../oauth2-connection-config/fetchUserProfile.js")
  vars = {
    tag                = "latest"
  }
}

resource "auth0_client" "comp_app_client" {
  name = "Singpass CF companion app"
  description = "Singpass CF companion app"
  app_type = "spa"
  oidc_conformant = true
  is_first_party = true

  callbacks = [
    "https://${var.auth0_custom_domain}/login/callback"
  ]

  jwt_configuration {
    alg = "RS256"
  }
}

resource "auth0_connection" "singpass" {
  name = "Singpass-STG-CF"
  strategy = "oauth2"
  options {
    client_id = auth0_client.comp_app_client.client_id
    client_secret = auth0_client.comp_app_client.client_secret
    authorization_endpoint = "https://singpass_authorize_proxy.abbaspour.workers.dev"
    token_endpoint = "https://singpass_token_proxy.abbaspour.workers.dev"
    scopes = ["openid"]
    scripts = {
      fetchUserProfile = data.template_file.fetchUserProfile.rendered
    }
  }

  enabled_clients = [
    auth0_client.sample_client.id,
    auth0_client.comp_app_client.id
  ]
}


