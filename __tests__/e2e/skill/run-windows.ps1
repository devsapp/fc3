# E2E for `fc3 skill install/update` on Windows.
# Fully sandboxed and offline; needs NO cloud credentials.
#
# The local component build is loaded through a minimal s.yaml that points at
# the repo root (component: <fc3_dir>) and is driven with `s skill ...`. We do
# NOT use `s cli <abs-path> ...`: on Windows the CLI joins that absolute path
# into its per-run log directory, which breaks when cwd (the temp sandbox on
# C:) and the repo (on D:) live on different drives.

$ErrorActionPreference = "Stop"

$current_dir = $PWD.Path
$fc3_dir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $current_dir))
Write-Host "fc3 root dir: $fc3_dir"

$tools = @("claude", "codex", "cursor", "qoder", "agents")

$projectRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("fc3-skill-proj-" + [System.Guid]::NewGuid().ToString("N"))
$homeRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("fc3-skill-home-" + [System.Guid]::NewGuid().ToString("N"))
$workRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("fc3-skill-work-" + [System.Guid]::NewGuid().ToString("N"))
$filterRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("fc3-skill-filter-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $projectRoot | Out-Null
New-Item -ItemType Directory -Force -Path $homeRoot | Out-Null
New-Item -ItemType Directory -Force -Path $workRoot | Out-Null
New-Item -ItemType Directory -Force -Path $filterRoot | Out-Null

# Drop a minimal offline s.yaml that loads the local build. The component path
# is single-quoted so backslashes stay literal in YAML.
function Write-SYaml($dir) {
  $yaml = @"
edition: 3.0.0
name: skill-e2e
resources:
  fc3:
    component: '$fc3_dir'
    props: {}
"@
  Set-Content -Path (Join-Path $dir "s.yaml") -Value $yaml -Encoding utf8
}

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

Write-SYaml $projectRoot
Write-SYaml $workRoot
Write-SYaml $filterRoot

try {
  Write-Host "=== project-scope install (all tools) ==="
  Set-Location $projectRoot
  s skill install --project
  foreach ($t in $tools) { Assert-File (Skill-Path $projectRoot $t) }

  Write-Host "=== install is idempotent: existing target is skipped ==="
  $marker = Join-Path $projectRoot ".claude\skills\s-fc3\LOCAL_MARKER"
  Set-Content -Path $marker -Value "keep-me"
  s skill install --project --tools claude
  Assert-File $marker

  Write-Host "=== --force overwrites and cleans stale files ==="
  s skill install --project --tools claude --force
  Assert-Missing $marker
  Assert-File (Skill-Path $projectRoot "claude")

  Write-Host "=== update overwrites existing installations ==="
  Set-Content -Path $marker -Value "stale"
  s skill update --project --tools claude
  Assert-Missing $marker
  Assert-File (Skill-Path $projectRoot "claude")

  Write-Host "=== --tools filter installs only the requested tools ==="
  Set-Location $filterRoot
  s skill install --project --tools codex
  Assert-File (Skill-Path $filterRoot "codex")
  Assert-Missing (Join-Path $filterRoot ".cursor\skills\s-fc3")

  Write-Host "=== global-scope install writes under the sandboxed home directory ==="
  Set-Location $workRoot
  $oldHome = $env:USERPROFILE
  try {
    $env:USERPROFILE = $homeRoot
    s skill install --global --tools claude,codex
  } finally {
    $env:USERPROFILE = $oldHome
  }
  Assert-File (Skill-Path $homeRoot "claude")
  Assert-File (Skill-Path $homeRoot "codex")

  Write-Host "=== skill e2e passed ==="
} finally {
  Set-Location $fc3_dir
  Remove-Item -Recurse -Force $projectRoot -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $homeRoot -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $workRoot -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $filterRoot -ErrorAction SilentlyContinue
}
