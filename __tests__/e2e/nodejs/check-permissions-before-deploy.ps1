# Windows PowerShell script for testing setNodeModulesBinPermissions functionality

Write-Host "=== Testing setNodeModulesBinPermissions Functionality ==="

# Change to the nodejs directory
Set-Location -Path "$PSScriptRoot"

# Run the function locally first
Write-Host "Running permissions validation test..." -ForegroundColor Green
cd test-permission-code

# Check if node_modules exists, install if not
if (-not (Test-Path "node_modules")) {
  Write-Host "Installing dependencies..."
  npm install
}

# Function to check and record permissions
function Check-Permissions {
  param([string]$Label)
  
  Write-Host "[$Label] Checking permissions..." -ForegroundColor Yellow
  
  # Create temporary JS file for checking permissions
  $jsCode = @"
const fs = require('fs');
const path = require('path');

console.log('=== ' + process.argv[1] + ' Permissions State ===');

const binPath = path.join('.', 'node_modules', '.bin');
if (fs.existsSync(binPath)) {
  console.log('✓ node_modules/.bin found');
  const files = fs.readdirSync(binPath);

  let executableCount = 0;
  let totalCount = 0;

  // Record permissions of first 5 files
  files.slice(0, 5).forEach(file => {
    const filePath = path.join(binPath, file);
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isDirectory()) {
        totalCount++;
        // Cross-platform executable check
        let hasExecutePermission = false;
        
        if (process.platform === 'win32') {
          // On Windows, check file extension for common executable types
          const ext = path.extname(file).toLowerCase();
          hasExecutePermission = (
            ext === '.exe' || 
            ext === '.cmd' || 
            ext === '.bat' || 
            ext === '.ps1' ||
            ext === '.com' ||
            ext === '.msi'
          );
        } else {
          // Unix way
          hasExecutePermission = (stat.mode & 0o111) !== 0;
        }
        
        if (hasExecutePermission) {
          executableCount++;
        }
        console.log(file + ': ' + (hasExecutePermission ? 'EXECUTABLE' : 'NON-EXECUTABLE') + ' (mode: ' + stat.mode.toString(8) + ', platform: ' + process.platform + ')');
      } else {
        console.log(file + ': DIRECTORY');
      }
    } catch (e) {
      console.log(file + ': ERROR - ' + e.message);
    }
  });
  
  // Return result for validation
  console.log('=== RESULT_FOR_VALIDATION ===');
  console.log('TOTAL_FILES:' + totalCount);
  console.log('EXECUTABLE_FILES:' + executableCount);
  console.log('=== END_RESULT ===');
} else {
  console.log('node_modules/.bin not found');
  console.log('=== RESULT_FOR_VALIDATION ===');
  console.log('TOTAL_FILES:0');
  console.log('EXECUTABLE_FILES:0');
  console.log('=== END_RESULT ===');
}

console.log('=== ' + process.argv[1] + ' State Recorded ===');
"@
  
  # Save to temp file and execute
  $tempFile = [System.IO.Path]::GetTempFileName() + ".js"
  $jsCode | Out-File -FilePath $tempFile -Encoding UTF8
  try {
    $result = node $tempFile $Label
    return $result
  } finally {
    if (Test-Path $tempFile) {
      Remove-Item $tempFile -Force
    }
  }
}

# Record initial permissions
$resultLines = Check-Permissions "BEFORE"

# Parse initial validation results
$initialTotalFiles = 0
$initialExecutableFiles = 0

foreach ($line in $resultLines) {
  if ($line -match "TOTAL_FILES:(\d+)") {
    $initialTotalFiles = [int]$matches[1]
  }
  if ($line -match "EXECUTABLE_FILES:(\d+)") {
    $initialExecutableFiles = [int]$matches[1]
  }
}

Write-Host "[BEFORE] Found $initialExecutableFiles/$initialTotalFiles executable files" -ForegroundColor Cyan

# Modify permissions to make them non-executable (simulate issue)
Write-Host "[MODIFY] Making files non-executable to test fix..." -ForegroundColor Yellow

$modifyJsCode = @"
const fs = require('fs');
const path = require('path');

const binPath = path.join('.', 'node_modules', '.bin');
if (fs.existsSync(binPath)) {
  const files = fs.readdirSync(binPath);

  // Remove executable permissions from first 3 files
  files.slice(0, 3).forEach(file => {
    const filePath = path.join(binPath, file);
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isDirectory()) {
        // Remove executable bits
        const newMode = stat.mode & ~0o111;
        fs.chmodSync(filePath, newMode);
        console.log('✓ Made non-executable: ' + file + ' (new mode: ' + newMode.toString(8) + ')');
      }
    } catch (e) {
      console.log('✗ Error modifying ' + file + ': ' + e.message);
    }
  });
}
"@

# Save to temp file and execute
$tempModifyFile = [System.IO.Path]::GetTempFileName() + ".js"
$modifyJsCode | Out-File -FilePath $tempModifyFile -Encoding UTF8
try {
  node $tempModifyFile
} finally {
  if (Test-Path $tempModifyFile) {
    Remove-Item $tempModifyFile -Force
  }
}

# Record permissions after modification
$resultLines = Check-Permissions "AFTER_MODIFY"

# Parse modified validation results
$modifiedTotalFiles = 0
$modifiedExecutableFiles = 0

foreach ($line in $resultLines) {
  if ($line -match "TOTAL_FILES:(\d+)") {
    $modifiedTotalFiles = [int]$matches[1]
  }
  if ($line -match "EXECUTABLE_FILES:(\d+)") {
    $modifiedExecutableFiles = [int]$matches[1]
  }
}

Write-Host "[AFTER_MODIFY] Found $modifiedExecutableFiles/$modifiedTotalFiles executable files" -ForegroundColor Cyan

# Verify that we successfully reduced executable files
if ($initialExecutableFiles -gt $modifiedExecutableFiles) {
  Write-Host "SUCCESS: Successfully reduced executable files from $initialExecutableFiles to $modifiedExecutableFiles" -ForegroundColor Green
} else {
  Write-Host "Warning: Executable file count not reduced (before: $initialExecutableFiles, after: $modifiedExecutableFiles)" -ForegroundColor Yellow
}

Write-Host "=== Pre-deployment setup completed ===" -ForegroundColor Cyan
Write-Host "Now proceeding with: s deploy -y -t s_permission.yaml" -ForegroundColor Cyan
Write-Host "After deployment, check if permissions were restored!" -ForegroundColor Cyan

cd ..