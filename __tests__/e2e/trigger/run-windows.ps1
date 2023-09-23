$ErrorActionPreference="Stop"

Write-Host "********* test http trigger ************"
cd ./http

$env:fc_component_function_name="test-http-trigger-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)-$($env:RANDSTR)"

Write-Host "test nodejs14 runtime http trigger ..."

s3 remove -y

s3 deploy --function -y
s3 deploy --trigger http_t -y
s3 version publish --description test
s3 alias publish --alias-name test --version-id latest
s3 alias get --alias-name test
s3 alias list
s3 deploy --trigger http_t2 -y
s3 info
s3 plan
s3 invoke -e 'hello latest'
s3 invoke -e 'hello latest' --qualifier 'test'
s3 remove -y

if ($env:region -ne $null -and $env:region -ne "cn-huhehaote") {
  Write-Host "Region is not equal to cn-huhehaote. Skip eb and other trigger test"
  exit 0
}

Write-Host "********* test other trigger ************"
cd ../other
$env:fc_component_function_name="test-other-trigger-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)-$($env:RANDSTR)"
Write-Host "test nodejs14 runtime with timer/oss/sls/mns trigger ..."
s3 deploy  -y
s3 info
s3 plan
s3 remove -y

Write-Host "********* test event bridge trigger ************"
cd ../eb
$env:fc_component_function_name="test-eb-trigger-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)-$($env:RANDSTR)"
Write-Host "test nodejs14 runtime with eb trigger ..."
s3 deploy  -y
s3 info
s3 plan
s3 remove -y
cd ../