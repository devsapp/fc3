$ErrorActionPreference="Stop"

$env:fc_component_runtime="python3"
$env:fc_component_function_name="python3-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)"
Write-Host "test python3 runtime ..."
s3 build
s3 local invoke -e '{"hello":"fc python3"}'
s3 deploy -y 
s3 info
s3 invoke -e '{"hello":"fc python3"}'
s3 remove -y


$env:fc_component_runtime="python3.10"
$env:fc_component_function_name="python310-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)"
Remove-Item -Recurse -Force ./code/3rd-packages -ErrorAction SilentlyContinue
Write-Host "test python3.10 runtime ..."
s3 build
s3 local invoke -e '{"hello":"fc python3.10"}'
s3 deploy -y 
s3 invoke -e '{"hello":"fc python3.10"}'
s3 remove -y


$env:fc_component_runtime="python3.9"
$env:fc_component_function_name="python39-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)"
Write-Host "test python3.9 runtime ..."
Remove-Item -Recurse -Force ./code/3rd-packages -ErrorAction SilentlyContinue
s3 build
s3 local invoke -e '{"hello":"fc python3.9"}'
s3 deploy -y 
s3 invoke -e '{"hello":"fc python3.9"}'
s3 remove -y

Remove-Item -Recurse -Force ./code/3rd-packages -ErrorAction SilentlyContinue