statistics:
	@wget -q https://images.devsapp.cn/tools/git-statistics.sh && bash git-statistics.sh && rm git-statistics.sh

test-nodejs:
	cd __tests__/e2e/nodejs && bash run && cd -

test-python:
	cd __tests__/e2e/python && bash run && cd -

test-java:
	cd __tests__/e2e/java && bash run && cd -

test-go:
	cd __tests__/e2e/go && bash run && cd -

test-php:
	cd __tests__/e2e/php && bash run && cd -

test-custom:
	cd __tests__/e2e/custom && bash run && cd -
	cd __tests__/e2e/custom.debian10 && bash run && cd -

test-custom-container:
	cd __tests__/e2e/custom-container && bash run && cd -

test-apt:
	cd __tests__/e2e/apt && bash run && cd -

test: test-nodejs test-python test-java test-go test-php test-custom  test-custom-container test-apt
	echo "all test done!"

release-dev:
	gsed -i "s/^Version: .*/Version: dev/" publish.yaml; \
	npm run publish

update-version:
	current_version=$$(curl -s https://api.devsapp.cn/v3/packages/fc3/release/latest | jq -r '.body.tag_name'); \
	echo $$current_version;\
	major_version=$$(echo $$current_version | cut -d"." -f1); \
	minor_version=$$(echo $$current_version | cut -d"." -f2); \
	patch_version=$$(echo $$current_version | cut -d"." -f3); \
	new_patch_version=$$((patch_version + 1)); \
	new_version=$$major_version.$$minor_version.$$new_patch_version; \
	gsed -i "s/^Version: .*/Version: $$new_version/" publish.yaml; \
	git diff --exit-code

release-prod:
	npm run publish
