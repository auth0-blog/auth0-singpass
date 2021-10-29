lambda_name=singpass-authorize
bundle=lambda-$(lambda_name)-$(version).zip
aws_profile=default

version := $(shell awk -F= '/^lambda_version/{print $$2}' ../../tf/terraform.auto.tfvars | tr -d '" ')
bucket := $(shell awk -F= '/^lambda_bucket/{print $$2}' ../../tf/terraform.auto.tfvars | tr -d '" ')

lambda: $(bundle)

js=./dist/app.js
ts=./src/authorize.ts

%.js: $(ts) tsconfig.json
	npm run build

lambda-$(lambda_name)-$(version).zip: $(js)
	rm -f $@
	cd dist && zip -Xr ../$@ . -x *.LICENSE.txt

.%-uploaded: $(bundle)
	aws s3 --profile $(aws_profile) cp $< s3://$(bucket)
	touch $@

upload: .$(bundle)-uploaded

.%-released: .%-uploaded
	aws lambda --profile $(aws_profile) update-function-code --function-name $(lambda_name) --s3-bucket $(bucket) --s3-key $(bundle) --publish 1>/dev/null
	touch $@

release: .$(bundle)-released

log:
	aws logs --profile default tail --follow /aws/lambda/$(lambda_name)

gw-log:
	aws logs --profile default tail --follow /api/logs

clean:
	rm -f lambda-$(lambda_name)-*.zip
	rm -rf dist
	rm -f .*-uploaded
	rm -f .*-released

.PHONY: clean log
