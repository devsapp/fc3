statistics:
	@wget -q https://images.devsapp.cn/tools/git-statistics.sh && bash git-statistics.sh && rm git-statistics.sh

ut-test:
	bash __tests__/examples/nodejs/run