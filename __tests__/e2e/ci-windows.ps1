# github action 使用

$ErrorActionPreference = "Stop"

# $env:region="ap-southeast-1"
# $env:OS="WIN"
# $env:PROCESSOR_ARCHITECTURE="NT"

Write-Host "test go runtime"
cd go
$env:fc_component_function_name = "go1-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)-$($env:RANDSTR)"
$env:GOOS = "linux"
$env:GOARCH = "amd64"
cd ./code; go mod tidy; go build -o ./target/main; cd ../
s deploy -y --skip-actions
s invoke -e '{"hello":"fc go1"}'
s info
s remove -y
Remove-Item -Recurse -Force ./code/target -ErrorAction SilentlyContinue
cd ..

Write-Host "test custom go runtime ..."
cd custom
Remove-Item -Recurse -Force ./go/code/go.sum -ErrorAction SilentlyContinue
$env:fc_component_function_name = "go1-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)-$($env:RANDSTR)"
$env:GOOS = "linux"
$env:GOARCH = "amd64"
cd ./go/code; go mod tidy; go build -o ./target/main; cd ../../
s deploy -y -t ./go/s.yaml --skip-actions
s invoke -e '{"hello":"fc custom go"}' -t ./go/s.yaml
s info -y -t ./go/s.yaml
s remove -y -t ./go/s.yaml
Remove-Item -Recurse -Force ./go/code/target -ErrorAction SilentlyContinue
cd ..


Write-Host "test java runtime"
cd java
$env:fc_component_function_name = "java-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)-$($env:RANDSTR)"
s deploy -y
s invoke -e '{"hello":"fc java"}'
s info
s remove -y
Remove-Item -Recurse -Force ./target -ErrorAction SilentlyContinue
cd ..

# Write-Host "test nodejs runtime with auto ..."
# cd nodejs
# $env:fc_component_function_name = "nodejs18-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)-$($env:RANDSTR)"
# s deploy -y -t ./s_auto.yaml
# s invoke -e '{"hello":"fc nodejs with auto"}' -t ./s_auto.yaml
# s info -y -t ./s_auto.yaml
# s remove -y -t ./s_auto.yaml
# cd ../

Write-Host " *********  command-api *********"
cd command-api; ./run-windows.ps1; cd ../

s cli fc3 layer list --prefix Python --region ap-southeast-1 -a quanxi
s cli fc3 layer info --layer-name Python39-Gradio --version-id 1 --region ap-southeast-1 -a quanxi
