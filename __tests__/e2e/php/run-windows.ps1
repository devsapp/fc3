$ErrorActionPreference = "Stop"

Write-Host "test php runtime ..."
$env:fc_component_function_name = "php72-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)"
s build
s local invoke -e '{"hello":"fc php"}'
s deploy -y
s info
s invoke -e '{"hello":"fc php"}'

Remove-Item -Recurse -Force ./code/vendor -ErrorAction SilentlyContinue
s build --script-file ./test.sh
s deploy -y 
s info
s invoke -e '{"hello":"fc php"}'

Remove-Item -Recurse -Force ./code/vendor -ErrorAction SilentlyContinue
s build --command='composer install -vvv' --custom-env '{"k": "v"}' --debug
s deploy -y 
s info
s invoke -e '{"hello":"fc php"}'

Remove-Item -Recurse -Force ./code/vendor -ErrorAction SilentlyContinue
s build --custom-args='-v' --debug
s deploy -y 
s info
s invoke -e '{"hello":"fc php"}'

s remove -y