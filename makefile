statistics:
	@wget -q https://images.devsapp.cn/tools/git-statistics.sh && bash git-statistics.sh && rm git-statistics.sh

ut-test:
	npm install --registry https://registry.npm.taobao.org
	npm run build
	npm install @serverless-devs/s@beta -g 
	s -v
	bash __tests__/examples/nodejs/run