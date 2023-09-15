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

install:
	npm install --registry=https://registry.npmmirror.com && bash fix-sdk.sh

install-official:
	npm install --registry=https://registry.npmjs.org && bash fix-sdk.sh