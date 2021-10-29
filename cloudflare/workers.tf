resource "cloudflare_worker_script" "authorize_ws" {
  name = "singpass_authorize_proxy"
  content = file("./authorize-worker.js")

  plain_text_binding {
    name = "AUTH0_CUSTOM_DOMAIN"
    text = var.auth0_custom_domain
  }
}

resource "cloudflare_worker_route" "authorize_route" {
  zone_id = var.cloudflare_zone_id
  pattern = "3pc.live/authorize"
  script_name = cloudflare_worker_script.authorize_ws.name
}

resource "cloudflare_worker_script" "token_ws" {
  name = "singpass_token_proxy"
  content = file("./token-worker.js")

  plain_text_binding {
    name = "SINGPASS_CLIENT_ID"
    text = var.singpass_client_id
  }

  plain_text_binding {
    name = "SINGPASS_TOKEN_ENDPOINT"
    text = var.singpass_token_endpoint
  }

  plain_text_binding {
    name = "SINGPASS_ENVIRONMENT"
    text = var.singpass_environment
  }

  plain_text_binding {
    name = "AUTH0_COMPANION_CLIENT_ID"
    text = auth0_client.comp_app_client.client_id
  }

  plain_text_binding {
    name = "SINGPASS_PUBLIC_KEY"
    text = data.http.singpass_public_key.body
  }

  secret_text_binding {
    name = "JWK"
    text = var.private_key
  }

  secret_text_binding {
    name = "AUTH0_COMPANION_CLIENT_SECRET"
    text =  auth0_client.comp_app_client.client_secret
  }

}

resource "cloudflare_worker_route" "token_route" {
  zone_id = var.cloudflare_zone_id
  pattern = "3pc.live/token"
  script_name = cloudflare_worker_script.token_ws.name
}


data "http" "singpass_public_key" {
  url = "${var.singpass_environment}/.well-known/keys"

  request_headers = {
    Accept = "application/json"
  }
}
