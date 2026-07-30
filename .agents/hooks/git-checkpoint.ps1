$ErrorActionPreference = "Stop"

function Write-HookJson {
    param([hashtable]$Payload)

    [Console]::Out.WriteLine(($Payload | ConvertTo-Json -Compress -Depth 5))
}

function Invoke-GitQuiet {
    param([string[]]$GitArguments)

    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    try {
        $output = @(& git @GitArguments 2>$null)
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }

    [pscustomobject]@{
        Output = @($output)
        ExitCode = $exitCode
    }
}

function Update-PactStatus {
    $pactRoot = "C:\AI-Stuff"
    $syncScript = Join-Path $pactRoot "scripts\sync-pact-status.ps1"
    if (-not (Test-Path -LiteralPath $syncScript -PathType Leaf)) {
        return
    }

    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    try {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $syncScript *> $null
    } finally {
        $ErrorActionPreference = $previousPreference
    }
}

$rawInput = [Console]::In.ReadToEnd()

try {
    $event = $rawInput | ConvertFrom-Json
} catch {
    Write-HookJson @{ continue = $true }
    exit 0
}

if ($event.stop_hook_active -eq $true) {
    Update-PactStatus
    Write-HookJson @{ continue = $true }
    exit 0
}

$rootResult = Invoke-GitQuiet @("rev-parse", "--show-toplevel")
$gitRoot = $rootResult.Output | Select-Object -First 1
if ($rootResult.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($gitRoot)) {
    Write-HookJson @{ continue = $true }
    exit 0
}

$statusResult = Invoke-GitQuiet @("-C", $gitRoot, "status", "--porcelain=v1", "--untracked-files=all")
$status = @($statusResult.Output)
if ($statusResult.ExitCode -ne 0) {
    Write-HookJson @{ continue = $true }
    exit 0
}

$branchResult = Invoke-GitQuiet @("-C", $gitRoot, "branch", "--show-current")
$branch = $branchResult.Output | Select-Object -First 1

if ($status.Count -gt 0) {
    $defaultBranchWarning = ""
    if ($branch -in @("main", "master")) {
        $defaultBranchWarning = " You are on the default branch; create a codex/* or agent/* task branch before committing."
    }

    $reason = @"
The worktree contains uncommitted changes. Before stopping, review git diff,
separate unrelated changes, run the relevant checks, and create a local commit
containing only files from the current user-approved write task.$defaultBranchWarning
Do not commit a read-only audit or a failed, incomplete, or unresolved change;
leave those changes untouched and explain the reason in the final response.
After a safe commit on an eligible task branch, push it to origin without force.
"@ -replace "\r?\n", " "

    Write-HookJson @{
        decision = "block"
        reason = $reason.Trim()
    }
    exit 0
}

if ([string]::IsNullOrWhiteSpace($branch) -or
    $branch -in @("main", "master") -or
    $branch -notmatch "^(codex|agent)/.+") {
    Write-HookJson @{ continue = $true }
    exit 0
}

$originResult = Invoke-GitQuiet @("-C", $gitRoot, "remote", "get-url", "origin")
$originUrl = $originResult.Output | Select-Object -First 1
if ($originResult.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($originUrl)) {
    Write-HookJson @{ continue = $true }
    exit 0
}

$upstreamResult = Invoke-GitQuiet @("-C", $gitRoot, "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}")
$upstream = $upstreamResult.Output | Select-Object -First 1
if ($upstreamResult.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($upstream)) {
    Write-HookJson @{
        decision = "block"
        reason = "The clean task branch has no upstream. If checks passed and this branch cannot deploy production, run git push -u origin HEAD. Never force-push, merge, publish, or deploy automatically."
    }
    exit 0
}

if ($upstream -notlike "origin/*") {
    Write-HookJson @{
        decision = "block"
        reason = "The task branch is not tracking origin. Verify the remote and, only when safe, publish the current branch with git push -u origin HEAD. Never force-push."
    }
    exit 0
}

$aheadResult = Invoke-GitQuiet @("-C", $gitRoot, "rev-list", "--count", "$upstream..HEAD")
$aheadText = $aheadResult.Output | Select-Object -First 1
$ahead = 0
if ($aheadResult.ExitCode -eq 0 -and [int]::TryParse($aheadText, [ref]$ahead) -and $ahead -gt 0) {
    Write-HookJson @{
        decision = "block"
        reason = "The clean task branch contains $ahead unpushed commit(s). If checks passed and this branch cannot deploy production, run git push origin HEAD. Never force-push, merge, publish, or deploy automatically."
    }
    exit 0
}

Write-HookJson @{ continue = $true }
Update-PactStatus
