$ErrorActionPreference = "Stop"

$env:fc_component_runtime = "python3"
$env:fc_component_function_name = "python3-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)"
Write-Host "test python3 runtime ..."
s build
s local invoke -e '{"hello":"fc python3"}'
s deploy -y
s info
s invoke -e '{"hello":"fc python3"}'
s remove -y


$env:fc_component_runtime = "python3.10"
$env:fc_component_function_name = "python310-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)"
Remove-Item -Recurse -Force ./code/python -ErrorAction SilentlyContinue
Write-Host "test python3.10 runtime ..."
s build
s local invoke -e '{"hello":"fc python3.10"}'
s deploy -y
s invoke -e '{"hello":"fc python3.10"}'
s remove -y


$env:fc_component_runtime = "python3.9"
$env:fc_component_function_name = "python39-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)"
Write-Host "test python3.9 runtime ..."
Remove-Item -Recurse -Force ./code/python -ErrorAction SilentlyContinue
s build
s local invoke -e '{"hello":"fc python3.9"}'
s deploy -y
s invoke -e '{"hello":"fc python3.9"}'
s remove -y

Remove-Item -Recurse -Force ./code/python -ErrorAction SilentlyContinue
