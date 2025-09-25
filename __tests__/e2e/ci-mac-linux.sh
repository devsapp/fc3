#!/bin/bash

# github action 使用
# 不需要使用到 build 和 local 指令的测试集合均可以加到这里
# 需要 build 和 local 指令测试的集合会在 github action 中实现

set -e
set -v

if [[ $(uname -s) == "Linux" ]]; then
    # echo "test trigger"
    # cd trigger && ./run
    # cd ..
    echo "test custom-domain"
    cd custom-domain
    s deploy -y
    s info
    s remove -y

    s deploy -y -t s2.yaml
    s info -t s2.yaml
    curl -v test-cd3.fcv3.1431999136518149.cn-hongkong.fc.devsapp.net
    s remove -y -t s2.yaml
    cd ..
else
    echo "skip test trigger"
fi

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

echo "test php runtime with session config"
cd php
export fc_component_function_name=php-$(uname)-$(uname -m)-$RANDSTR
s deploy -y
s info
s remove -y
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
export fc_component_function_name=nodejs18-$(uname)-$(uname -m)-$RANDSTR
s deploy -y -t s_auto.yaml
s invoke -e '{"hello":"fc nodejs with auto"}' -t s_auto.yaml
s info -y -t s_auto.yaml
s remove -y -t s_auto.yaml

echo "test nodejs runtime with more vpc and nas auto ..."
export fc_component_function_name=nodejs16-$(uname)-$(uname -m)-$RANDSTR
s deploy -y -t ./s_lock_auto.yaml
s invoke -e '{"hello":"fc nodejs with more vpc and nas auto"}' -t ./s_lock_auto.yaml
s info -y -t ./s_lock_auto.yaml
s remove -y -t ./s_lock_auto.yaml

echo "test nodejs runtime with tags ..."
export fc_component_function_name=nodejs16-$(uname)-$(uname -m)-$RANDSTR
s deploy -y -t ./s_tags.yaml
s deploy -y -t ./s_tags2.yaml
s deploy -y -t ./s_tags3.yaml
s remove -y -t ./s_tags3.yaml

echo "test nodejs runtime with custom endpoint ..."
s deploy -y -t ./s_custom_endpoint.yaml
s remove -y -t ./s_custom_endpoint.yaml

echo "test deploy with alias"
export fc_component_function_name=nodejs18-$(uname)-$(uname -m)-$RANDSTR
s deploy --function -t s2.yaml
versionId=$(s version publish -t s2.yaml --silent -o json | jq -r '."versionId"')
echo "latest version = $versionId"
if [[ "$versionId" -gt 1 ]]; then
    mainVersion=$((versionId - 1))
    echo "main version = $mainVersion"
    s alias publish --alias-name test --version-id $mainVersion --vw "{\"$versionId\": 0.2}" -t s2.yaml
else
    s alias publish --alias-name test --version-id $versionId -t s2.yaml
fi

s deploy --trigger -t s2.yaml
s deploy --async-invoke-config -t s2.yaml
s info -t s2.yaml
s remove -y -t s2.yaml
cd ..

echo " *********  test scaling config *********"
cd scaling && ./run && cd -

echo " *********  command-api *********"
cd command-api && ./run && cd -
cd command-api && ./run_cli_mode && cd -