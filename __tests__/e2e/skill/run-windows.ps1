# E2E for `fc3 skill install/update` on Windows.
# Fully sandboxed and offline; needs NO cloud credentials.

$ErrorActionPreference = "Stop"

$current_dir = $PWD.Path
$fc3_dir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $current_dir))
Write-Host "fc3 root dir: $fc3_dir"

$tools = @("claude", "codex", "cursor", "qoder", "agents")

$projectRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("fc3-skill-proj-" + [System.Guid]::NewGuid().ToString("N"))
$homeRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("fc3-skill-home-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $projectRoot | Out-Null
New-Item -ItemType Directory -Force -Path $homeRoot | Out-Null

function Assert-File($p) {
  if (-not (Test-Path -PathType Leaf $p)) {
    Write-Host "ASSERT FAILED: expected file not found: $p" -ForegroundColor Red
    exit 1
  }
  Write-Host "OK: $p"
}

function Assert-Missing($p) {
  if (Test-Path $p) {
    Write-Host "ASSERT FAILED: expected path to be gone: $p" -ForegroundColor Red
    exit 1
  }
  Write-Host "OK (absent): $p"
}

function Skill-Path($root, $tool) {
  return (Join-Path $root ".$tool\skills\s-fc3\SKILL.md")
}

try {
  Write-Host "=== project-scope install (all tools) ==="
  Set-Location $projectRoot
  s cli $fc3_dir skill install --project
  foreach ($t in $tools) { Assert-File (Skill-Path $projectRoot $t) }

  Write-Host "=== install is idempotent: existing target is skipped ==="
  $marker = Join-Path $projectRoot ".claude\skills\s-fc3\LOCAL_MARKER"
  Set-Content -Path $marker -Value "keep-me"
  s cli $fc3_dir skill install --project --tools claude
  Assert-File $marker

  Write-Host "=== --force overwrites and cleans stale files ==="
  s cli $fc3_dir skill install --project --tools claude --force
  Assert-Missing $marker
  Assert-File (Skill-Path $projectRoot "claude")

  Write-Host "=== update overwrites existing installations ==="
  Set-Content -Path $marker -Value "stale"
  s cli $fc3_dir skill update --project --tools claude
  Assert-Missing $marker
  Assert-File (Skill-Path $projectRoot "claude")

  Write-Host "=== global-scope install writes under the sandboxed home directory ==="
  Set-Location $fc3_dir
  $oldHome = $env:USERPROFILE
  try {
    $env:USERPROFILE = $homeRoot
    s cli $fc3_dir skill install --global --tools claude,codex
  } finally {
    $env:USERPROFILE = $oldHome
  }
  Assert-File (Skill-Path $homeRoot "claude")
  Assert-File (Skill-Path $homeRoot "codex")

  Write-Host "=== skill e2e passed ==="
} finally {
  Remove-Item -Recurse -Force $projectRoot -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $homeRoot -ErrorAction SilentlyContinue
}
