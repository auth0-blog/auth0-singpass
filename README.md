# Auth0 Singpass Integration
Companion source code for [Auth0 Singpass Integration blog post](https://auth0.com/blog/auth0-integration-with-singpass)


# Sequence Diagram
![Sequence Diagram](https://www.websequencediagrams.com/files/render?link=c6XmaXV8DBb97kQEb34fO3jDqJ2ZpVwIdm0hCdfbKwA0kYuCvIhCqjRemxTaerGa)


# Setup
> Note: after creating connection, enable [PKCE](#EnablePKCEonConnection). 

## Cloudflare
```bash
cd cloudflare
cp terraform.auto.tfvars-sample terraform.auto.tfvars
vim terraform.auto.tfvars
terraform init
make
make deploy
make log-token
```

## AWS
```bash
cd aws/tf
cp terraform.auto.tfvars-sample terraform.auto.tfvars
vim terraform.auto.tfvars
terraform init
make
make deploy


cd ../lambda/authorize
npm i
make 
make release

cd ../lambda/token
npm i
make 
make release
make log
```

## Express
```bash
cd express
cp .env.sample .env
vim .env
npm i
npm start
```

## Enable PKCE on Connection
This step needs to be done only, since connection level `pkce_enable` flag is not supported by 
Terraform provider [yet](https://github.com/alexkappa/terraform-provider-auth0/issues/460).

```bash
export access_token='M2M-ACCESS-TOKEN'
./enable-pkce.sh -c connection_id
```

