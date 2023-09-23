$ErrorActionPreference="Stop"

Write-Host "test custom go runtime ..."
Remove-Item -Recurse -Force ./go/code/go.sum -ErrorAction SilentlyContinue
$env:fc_component_function_name="go1-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)"
$env:GOOS = "linux"
$env:GOARCH = "amd64"
cd ./go/code && go mod tidy && go build -o ./target/main && cd ../../
s3 deploy -y -t ./go/s.yaml --skip-actions
s3 invoke -e '{"hello":"fc custom go"}' -t ./go/s.yaml
s3 local invoke -e '{"hello":"fc custom go"}' -t ./go/s.yaml
s3 info -y -t ./go/s.yaml
s3 remove -y -t ./go/s.yaml
Remove-Item -Recurse -Force ./go/code/target -ErrorAction SilentlyContinue


Write-Host "test custom python runtime ..."
Remove-Item -Recurse -Force ./python/code/3rd-packages -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ./python/code/__pycache__ -ErrorAction SilentlyContinue
$env:fc_component_function_name="python310-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)"
s3 build -t ./python/s.yaml
s3 local invoke -e '{"hello":"fc custom python"}' -t ./python/s.yaml
s3 deploy -y -t ./python/s.yaml
s3 invoke -e '{"hello":"fc custom python"}' -t ./python/s.yaml
s3 info -y -t ./python/s.yaml
s3 remove -y -t ./python/s.yaml

Write-Host "test custom java(springboot) runtime ..."
Remove-Item -Recurse -Force ./springboot/code/target -ErrorAction SilentlyContinue
$env:fc_component_function_name="springboot-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)"
s3 deploy -y -t ./springboot/s.yaml
s3 invoke --event-file ./springboot/event/http.json -t ./springboot/s.yaml
s3 info -t ./springboot/s.yaml
s3 jar_zip local invoke --event-file ./springboot/event/http.json -t ./springboot/s.yaml
s3 jar local invoke --event-file ./springboot/event/http.json -t ./springboot/s.yaml
s3 remove -y -t ./springboot/s.yaml
