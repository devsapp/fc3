$ErrorActionPreference = "Stop"

Write-Host "test custom go runtime ..."
$env:fc_component_function_name = "go1-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)"
$env:GOOS = "linux"
$env:GOARCH = "amd64"
cd ./go/code; go mod tidy; go build -o ./target/main; cd ../../
s deploy -y -t ./go/s.yaml --skip-actions
s invoke -e '{"hello":"fc custom go"}' -t ./go/s.yaml
s local invoke -e '{"hello":"fc custom go"}' -t ./go/s.yaml
s info -y -t ./go/s.yaml
s remove -y -t ./go/s.yaml
Remove-Item -Recurse -Force ./go/code/target -ErrorAction SilentlyContinue


Write-Host "test custom python runtime ..."
$env:fc_component_function_name = "python310-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)"
s build -t ./python/s.yaml
s local invoke -e '{"hello":"fc custom python"}' -t ./python/s.yaml
s deploy -y -t ./python/s.yaml
s invoke -e '{"hello":"fc custom python"}' -t ./python/s.yaml
s info -y -t ./python/s.yaml
s remove -y -t ./python/s.yaml
Remove-Item -Recurse -Force ./python/code/python -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ./python/code/__pycache__ -ErrorAction SilentlyContinue

Write-Host "test custom java(springboot) runtime ..."
$env:fc_component_function_name = "springboot-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)"
s deploy -y -t ./springboot/s.yaml
s invoke --event-file ./springboot/event/http.json -t ./springboot/s.yaml
s info -t ./springboot/s.yaml
s jar_zip local invoke --event-file ./springboot/event/http.json -t ./springboot/s.yaml
s jar local invoke --event-file ./springboot/event/http.json -t ./springboot/s.yaml
s remove -y -t ./springboot/s.yaml
Remove-Item -Recurse -Force ./springboot/code/target -ErrorAction SilentlyContinue
