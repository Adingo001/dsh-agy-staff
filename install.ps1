#Requires -Version 7
<#
.SYNOPSIS
    Install the agy-staff personas as DeepSeek Harness skills.

.DESCRIPTION
    One-shot installer:

      1. checks Node.js (needed by the agy companion) and the `agy` CLI,
      2. locates - or clones - a keli-wen/agy-staff checkout,
      3. runs build-skills.ps1 to publish `agy-*` skills into <DshHome>/skills,
      4. prints the smoke test.

.PARAMETER Upstream
    Existing agy-staff checkout. Default: auto-detect, else clone into ~/agy-staff.

.PARAMETER DshHome
    Harness config root. Default: $env:DSH_HOME or ~/.dsh.

.PARAMETER Check
    Dry run: verify prerequisites and print the plan, write nothing.

.EXAMPLE
    pwsh -File install.ps1

.EXAMPLE
    pwsh -File install.ps1 -Upstream D:\project\agy-staff -Check
#>
[CmdletBinding()]
param(
    [string]$Upstream,
    [string]$DshHome = $(if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }),
    [switch]$Check
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$builder = Join-Path $here 'build-skills.ps1'
if (-not (Test-Path -LiteralPath $builder)) { throw "build-skills.ps1 not found next to install.ps1" }

# ------------------------------------------------------------------ prerequisites

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw 'Node.js not found in PATH; the agy companion is a Node script' }
$nodeVersion = (& node --version).TrimStart('v')
"node   : $nodeVersion ($($node.Source))"

$agy = Get-Command agy -ErrorAction SilentlyContinue
if ($agy) {
    $agyVersion = (& agy --version 2>$null | Select-Object -First 1)
    "agy    : $agyVersion ($($agy.Source))"
} else {
    "agy    : NOT FOUND - install it first: https://antigravity.google/docs/cli/install"
    "         (skills still install; every agy call will fail until the CLI exists)"
}

# ---------------------------------------------------------------------- upstream

$source = $Upstream
if (-not $source) {
    $probe = @(
        (Join-Path $HOME 'agy-staff'),
        (Join-Path $HOME '.agy-staff'),
        (Join-Path $HOME 'Documents\agy-staff'),
        'D:\project\agy-staff'
    ) | Where-Object { $_ -and (Test-Path (Join-Path $_ 'skills')) } | Select-Object -First 1

    if ($probe) {
        $source = (Resolve-Path $probe).Path
    } else {
        $source = Join-Path $HOME 'agy-staff'
        if (-not $Check) {
            "cloning: https://github.com/keli-wen/agy-staff -> $source"
            & git clone --depth 1 https://github.com/keli-wen/agy-staff.git $source
            if ($LASTEXITCODE -ne 0) { throw 'git clone failed' }
        } else {
            "would clone: https://github.com/keli-wen/agy-staff -> $source"
        }
    }
}

# ------------------------------------------------------------------------- build

& $builder -Upstream $source -DshHome $DshHome -Check:$Check
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $Check) {
    ""
    "Smoke test (3 s, needs an authenticated agy):"
    "  node `"$DshHome\companion\agy-companion.mjs`" ask --prompt `"reply with OK`""
    ""
    "Then type /agy in the composer to list the seven skills."
}
exit 0
