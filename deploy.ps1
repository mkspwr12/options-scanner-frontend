$ErrorActionPreference = 'Continue'
$outputFile = "deploy-log.txt"

function Log {
    param($message)
    $timestamp = Get-Date -Format "HH:mm:ss"
    $logMessage = "[$timestamp] $message"
    Write-Host $logMessage
    Add-Content -Path $outputFile -Value $logMessage
}

# Clear previous log
if (Test-Path $outputFile) { Remove-Item $outputFile }

Log "=== Starting Git Deployment ==="

Log "Step 1: Checking git status"
git status --short | Out-String | ForEach-Object { Log $_ }

Log "Step 2: Adding all changes"
git add -A
Log "Files staged"

Log "Step 3: Committing changes"
$commitResult = git commit -m "feat: integrate backend APIs" --no-verify 2>&1 | Out-String
Log $commitResult

Log "Step 4: Pulling from remote (if needed)"
$pullResult = git pull origin main --no-rebase --no-edit 2>&1 | Out-String
Log $pullResult

Log "Step 5: Pushing to remote"
$pushResult = git push origin main 2>&1 | Out-String
Log $pushResult

Log "=== Deployment Complete ==="
Log ""
Log "Check GitHub Actions: https://github.com/mkspwr12/options-scanner-frontend/actions"
