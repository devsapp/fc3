$ErrorActionPreference = "Stop"

Write-Host "test session operations..."

# Deploy function first
Write-Host "Deploying function..."
s deploy -y

# Test create session
Write-Host "Testing create session..."
$createResult = s cli fc3 session create -a quanxi --region cn-hangzhou --function-name "fc3-session-$($env:fc_component_function_name)" --qualifier LATEST --session-ttl-in-seconds 3600 --session-idle-timeout-in-seconds 1800 -o json | ConvertFrom-Json
$sessionId = $createResult.sessionId
if ([string]::IsNullOrEmpty($sessionId)) {
  Write-Error "Failed to create session"
  exit 1
}
Write-Host "Created session: $sessionId"

# Test get session
Write-Host "Testing get session..."
$getResult = s cli fc3 session get -a quanxi --region cn-hangzhou --function-name "fc3-session-$($env:fc_component_function_name)" --session-id $sessionId --qualifier LATEST -o json | ConvertFrom-Json
if ($null -eq $getResult) {
  Write-Error "Failed to get session"
  exit 1
}
Write-Host "Get session result: $($getResult | ConvertTo-Json)"

# Test update session
Write-Host "Testing update session..."
$updateResult = s cli fc3 session update -a quanxi --region cn-hangzhou --function-name "fc3-session-$($env:fc_component_function_name)" --session-id $sessionId --qualifier LATEST --session-ttl-in-seconds 7200 -o json | ConvertFrom-Json
if ($null -eq $updateResult) {
  Write-Error "Failed to update session"
  exit 1
}
Write-Host "Update session result: $($updateResult | ConvertTo-Json)"

# Test list sessions
Write-Host "Testing list sessions..."
$listResult = s cli fc3 session list -a quanxi --region cn-hangzhou --function-name "fc3-session-$($env:fc_component_function_name)" -o json | ConvertFrom-Json
if ($null -eq $listResult) {
  Write-Error "Failed to list sessions"
  exit 1
}
Write-Host "List sessions result: $($listResult | ConvertTo-Json)"

# Test list sessions with filters
Write-Host "Testing list sessions with filters..."
$listFilteredResult = s cli fc3 session -a quanxi --region cn-hangzhou list --function-name "fc3-session-$($env:fc_component_function_name)" --session-id $sessionId --qualifier LATEST -o json | ConvertFrom-Json
if ($null -eq $listFilteredResult) {
  Write-Error "Failed to list sessions with filters"
  exit 1
}
Write-Host "List sessions with filters result: $($listFilteredResult | ConvertTo-Json)"

# Test remove session
Write-Host "Testing remove session..."
$removeResult = s cli fc3 session remove -a quanxi --region cn-hangzhou --function-name "fc3-session-$($env:fc_component_function_name)" --session-id $sessionId --qualifier LATEST -y -o json
Write-Host "Remove session result: $removeResult"

# Test create session without optional parameters (should use defaults)
Write-Host "Testing create session with default parameters..."
$createResult2 = s cli fc3 session create -a quanxi --region cn-hangzhou --function-name "fc3-session-$($env:fc_component_function_name)" --qualifier LATEST -o json | ConvertFrom-Json
$sessionId2 = $createResult2.sessionId
if ([string]::IsNullOrEmpty($sessionId2)) {
  Write-Error "Failed to create session with default parameters"
  exit 1
}
Write-Host "Created session with defaults: $sessionId2"

# Clean up second session
s cli fc3 session remove -a quanxi --region cn-hangzhou --function-name "fc3-session-$($env:fc_component_function_name)" --session-id $sessionId2 --qualifier LATEST -y

# Clean up function
Write-Host "Cleaning up..."
s remove -y

Write-Host "All session tests passed!"