$ErrorActionPreference = "Stop"

Write-Host "********* test http trigger ************"
cd ./http

$env:fc_component_function_name = "test-http-trigger-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)-$($env:RANDSTR)"

Write-Host "test nodejs18 runtime http trigger ..."

s remove -y

s deploy --function -y
s deploy --trigger http_t -y
s version publish --description test
s alias publish --alias-name test --version-id latest
s alias get --alias-name test
s alias list
s deploy --trigger http_t2 -y
s info
s plan
s invoke -e 'hello latest'
s invoke -e 'hello latest' --qualifier 'test'
s remove -y

if ($env:region -ne $null -and $env:region -ne "cn-huhehaote") {
  Write-Host "Region is not equal to cn-huhehaote. Skip eb and other trigger test"
  exit 0
}

Write-Host "********* test other trigger ************"
cd ../other
$env:fc_component_function_name = "test-other-trigger-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)-$($env:RANDSTR)"
Write-Host "test nodejs18 runtime with timer/oss/sls/mns trigger ..."
s deploy  -y
s info
s plan
s remove -y

Write-Host "********* test event bridge trigger ************"
cd ../eb
$env:fc_component_function_name = "test-eb-trigger-$($env:OS)-$($env:PROCESSOR_ARCHITECTURE)-$($env:RANDSTR)"
Write-Host "test nodejs18 runtime with eb trigger ..."
s deploy  -y
s info
s plan
s remove -y
cd ../