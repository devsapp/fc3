#!/bin/bash

# 不需要使用到 build 和 local 指令的测试集合均可以加到这里
# 需要 build 和 local 指令测试的集合会在 github action 中实现

set -e
set -v

echo "test custom-domain"
cd custom-domain
s deploy -y
curl -v xiliu-test.devsapp.net
curl -v xiliu-test.devsapp.net/a
s info
s remove -y

s deploy -y -t s2.yaml
curl -v test-cd3.fcv3.1431999136518149.cn-hongkong.fc.devsapp.net
s info -t s2.yaml
s remove -y -t s2.yaml
cd ..

# s deploy -y -t s2.yaml
# s invoke -t s2.yaml
# s info -t s2.yaml
# s remove -y -t s2.yaml
# cd ..

echo " *********  command-api *********"
cd command-api && bash ./run && cd -
cd command-api && bash ./run_cli_mode && cd -

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

echo "test deploy with alias"
cd nodejs
export fc_component_function_name=nodejs14-$(uname)-$(uname -m)-$RANDSTR
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

echo "test http trigger with jwt ..."
cd trigger/jwt
export fc_component_function_name=nodejs16-$(uname)-$(uname -m)-$RANDSTR
s deploy -y -t ./s.yaml
s invoke -e '{"hello":"fc http trigger with jwt"}' -t ./s.yaml
url1=$(s info -y -t ./s.yaml --silent -o json | jq -r '.hello_world.url.system_url')
url2=$(s info -y -t ./s.yaml --silent -o json | jq -r '.hello_world_2.url.system_url')
echo $url1
echo $url2
curl -XPOST $url1/black1/aa -d '{"test":"jwt"}'
curl -XPOST $url1/black2/aaa -d '{"test":"jwt"}'
curl -XPOST $url1/black1/bbb -d '{"test":"jwt"}'
curl -XPOST $url1/black1/bbb -d '{"test":"jwt"}' -H "Authentication: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiSm9obiIsImFkbWluIjp0cnVlLCJleHAiOjE3MDkxODg1MzksIm5iZiI6MTcwOTAxNTc1NCwiaWF0IjoxNzA5MDE1NzU2fQ.LknspC5W2QEThq9xpF1OciAJKpQMJmhkPGRWCS4rRoEeyTYl7bzKLqTuEhKE1I-luzjjIXNsnK6Ypbk_ith5mV2Wz6TTfQ-BF_dfBEfx75A9lDaTyLrn_zNLlOs-qsxst2y7eAOQQ7lb2mubFlLA3LDAWO-4UBJDLes0Mn6rp5pzSbF5zNypd319J1R6gAGBUBsPFGeTkxjr3ykHlB_nKNV0G7WpK9z_QvXQkT4os3oU2rs2tL1QQO4P3pSDB2lvEJ0dsXVggJi1rr6Av22uDI1lFo0PEekJmdFns-VIS36ipy3Ppgd7f5gicBNgUyhNUggPbdyePfV7zCkw3IrU-w"
curl -XPOST $url1/black1/bbb -d '{"test":"jwt"}' -H "Authentication: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Ind3dy5iZWpzb24uY29tIiwic3ViIjoiZGVtbyIsImlhdCI6MTcwOTAxOTM5MCwibmJmIjoxNzA5MDE5MzkwLCJleHAiOjE3MDkxMDU3OTB9.TmHPtcD76VBNelt0Qdjc-SsYxfpxIzNIL0FSz8JAQchhqkXnhpqK5j2_sE0ot6Fx_bwFQHEB0erJLn4Ey7OtJgT4B3etxlpcw39jk2M1YidkFfKHgq2d8tUXa-Nu8mpvVQP7kQJ-Z-l_OkiJZs1NpgaKo5646k0vEaQqmzW3aYwuL4NE2tumDoYDCzexLzUTuzNUucxZ8sZYqf5_yIcLXueHItGampnLMtsWLNH3StXoiQWkS79Lhj04Lq5YTO4Sd074KNc5juJRZwqNpjddaQ08_5ry_jhOr0C3c1uEatehCePJozQZIdELf0Y6gN0-CYRhcJPiz5ynbOB9pNMLUw"
curl -XPOST $url2/white1/aaa -d '{"test":"jwt"}'
curl -XPOST $url2/white2/ccc -d '{"test":"jwt"}'
curl -XPOST $url2/common/aaa -d '{"test":"jwt"}' -H "Authentication: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiSm9obiIsImFkbWluIjp0cnVlLCJleHAiOjE3MDkxODg1MzksIm5iZiI6MTcwOTAxNTc1NCwiaWF0IjoxNzA5MDE1NzU2fQ.LknspC5W2QEThq9xpF1OciAJKpQMJmhkPGRWCS4rRoEeyTYl7bzKLqTuEhKE1I-luzjjIXNsnK6Ypbk_ith5mV2Wz6TTfQ-BF_dfBEfx75A9lDaTyLrn_zNLlOs-qsxst2y7eAOQQ7lb2mubFlLA3LDAWO-4UBJDLes0Mn6rp5pzSbF5zNypd319J1R6gAGBUBsPFGeTkxjr3ykHlB_nKNV0G7WpK9z_QvXQkT4os3oU2rs2tL1QQO4P3pSDB2lvEJ0dsXVggJi1rr6Av22uDI1lFo0PEekJmdFns-VIS36ipy3Ppgd7f5gicBNgUyhNUggPbdyePfV7zCkw3IrU-w"
curl -XPOST $url2/common/aaa -d '{"test":"jwt"}' -H "Authentication: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Ind3dy5iZWpzb24uY29tIiwic3ViIjoiZGVtbyIsImlhdCI6MTcwOTAxOTM5MCwibmJmIjoxNzA5MDE5MzkwLCJleHAiOjE3MDkxMDU3OTB9.TmHPtcD76VBNelt0Qdjc-SsYxfpxIzNIL0FSz8JAQchhqkXnhpqK5j2_sE0ot6Fx_bwFQHEB0erJLn4Ey7OtJgT4B3etxlpcw39jk2M1YidkFfKHgq2d8tUXa-Nu8mpvVQP7kQJ-Z-l_OkiJZs1NpgaKo5646k0vEaQqmzW3aYwuL4NE2tumDoYDCzexLzUTuzNUucxZ8sZYqf5_yIcLXueHItGampnLMtsWLNH3StXoiQWkS79Lhj04Lq5YTO4Sd074KNc5juJRZwqNpjddaQ08_5ry_jhOr0C3c1uEatehCePJozQZIdELf0Y6gN0-CYRhcJPiz5ynbOB9pNMLUw"
s plan -t ./s.yaml
s info -y -t ./s.yaml
s remove -y -t ./s.yaml
cd ..
