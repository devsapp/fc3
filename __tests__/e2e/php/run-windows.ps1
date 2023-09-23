$ErrorActionPreference="Stop"

Write-Host "test php runtime ..."
$env:fc_component_function_name="php72-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)"
s3 build
s3 local invoke -e '{"hello":"fc php"}'
s3 deploy -y
s3 info
s3 invoke -e '{"hello":"fc php"}'

Remove-Item -Recurse -Force ./code/vendor -ErrorAction SilentlyContinue
s3 build --script-file ./test.sh
s3 deploy -y 
s3 info
s3 invoke -e '{"hello":"fc php"}'

Remove-Item -Recurse -Force ./code/vendor -ErrorAction SilentlyContinue
s3 build --command='composer install -vvv' --custom-env '{"k": "v"}' --debug
s3 deploy -y 
s3 info
s3 invoke -e '{"hello":"fc php"}'

Remove-Item -Recurse -Force ./code/vendor -ErrorAction SilentlyContinue
s3 build --custom-args='-v' --debug
s3 deploy -y 
s3 info
s3 invoke -e '{"hello":"fc php"}'

s3 remove -y