#!/bin/bash

# 不需要使用到 build 和 local 指令的测试集合均可以加到这里
# 需要 build 和 local 指令测试的集合会在 github action 中实现

set -e
set -v

# export FC_CLIENT_CONNECT_TIMEOUT=3
# export FC_CLIENT_READ_TIMEOUT=5

echo "test go runtime"
cd go
export fc_component_function_name=go1-$(uname)-$(uname -m)-$RANDSTR
s deploy -y
s invoke -e '{"hello":"fc go1"}'
s info
s remove -y
rm -rf ./code/target
cd ..


echo "test java runtime"
cd java
export fc_component_function_name=java-$(uname)-$(uname -m)-$RANDSTR
s deploy -y
s invoke -e '{"hello":"fc java"}'
s info
s remove -y
rm -rf ./target
cd ..


echo "test custom go runtime ..."
cd custom
rm -rf ./go/code/go.sum
export fc_component_function_name=go1-$(uname)-$(uname -m)-$RANDSTR
s deploy -y -t ./go/s.yaml
s invoke -e '{"hello":"fc custom go"}' -t ./go/s.yaml
s info -y -t ./go/s.yaml
s remove -y -t ./go/s.yaml
rm -rf ./go/code/target
cd ..


echo "test nodejs runtime with auto ..."
cd nodejs
export fc_component_function_name=nodejs14-$(uname)-$(uname -m)-$RANDSTR
s deploy -y -t ./s_auto.yaml
s invoke -e '{"hello":"fc nodejs with auto"}' -t ./s_auto.yaml
s info -y -t ./s_auto.yaml
s remove -y -t ./s_auto.yaml
cd ..

echo " *********  command-api *********"
cd command-api && ./run && cd -
cd command-api && ./run_cli_mode && cd -
