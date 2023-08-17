#!/bin/bash

# 不需要使用到 build 和 local 指令的测试集合均可以加到这里
# 需要 build 和 local 指令测试的集合会在 github action 中实现

set -e
set -v

export FC_CLIENT_CONNECT_TIMEOUT=3
export FC_CLIENT_READ_TIMEOUT=5
export RANDSTR=ci

echo "test go runtime"
cd go
export fc_component_function_name=go1-$(uname)-$(uname -m)-$RANDSTR
s3 deploy -y
s3 invoke -e '{"hello":"fc go1"}'
s3 local invoke -e '{"hello":"fc go1"}'
s3 info
s3 remove -y
rm -rf ./code/target
cd ..


echo "test java runtime"
cd java
export fc_component_function_name=java-$(uname)-$(uname -m)-$RANDSTR
s3 deploy -y
s3 invoke -e '{"hello":"fc java"}'
s3 local invoke -e '{"hello":"fc java"}'
s3 info
s3 remove -y
rm -rf ./target
cd ..


echo "test custom go runtime ..."
cd custom
rm -rf ./go/code/go.sum
export fc_component_function_name=go1-$(uname)-$(uname -m)-$RANDSTR
s3 deploy -y -t ./go/s.yaml
s3 invoke -e '{"hello":"fc custom go"}' -t ./go/s.yaml
s3 local invoke -e '{"hello":"fc custom go"}' -t ./go/s.yaml
s3 info -y -t ./go/s.yaml
s3 remove -y -t ./go/s.yaml
rm -rf ./go/code/target
cd ..

echo "test command cli"
cd command-api
export fc_component_function_name=node16-$(uname)-$(uname -m)-$RANDSTR
echo "test nodejs16 runtime ..."
s3 deploy -y

s3 version publish --description test
s3 version list
s3 version remove --version-id latest  -y
s3 version publish --description test

s3 concurrency put --reserved-concurrency 80
s3 concurrency get
s3 concurrency remove -y

s3 alias list
s3 alias publish --alias-name test --version-id latest
s3 alias get --alias-name test
s3 alias list
s3 alias remove --alias-name test  -y
s3 alias publish --alias-name test --version-id latest

s3 provision put --qualifier test --ac --target 2 --scheduled-actions '[{"name":"scheduled-actions","startTime":"2023-08-15T02:04:00.000Z","endTime":"2033-08-15T02:04:00.000Z","target":1,"scheduleExpression":"cron(0 0 4 * * *)"}]' --target-tracking-policies '[{"name":"target-tracking-policies","startTime":"2023-08-15T02:05:00.000Z","endTime":"2033-08-15T02:05:00.000Z","metricType":"ProvisionedConcurrencyUtilization","metricTarget":0.6,"minCapacity":1,"maxCapacity":3}]'

s3 provision get --qualifier test
s3 provision list
s3 provision remove --qualifier test -y
s3 provision list
s3 provision put --qualifier test --target 2 

s3 remove -y

cd ..


echo "test trigger"
cd trigger
./run
cd ..