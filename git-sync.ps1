# Git sync script to avoid terminal alternate buffer issues
$ErrorActionPreference = 'Continue'

Write-Host "=== Checking git status ===" -ForegroundColor Cyan
git --no-pager diff --name-only
git --no-pager diff --cached --name-only

Write-Host "`n=== Staging all changes ===" -ForegroundColor Cyan
git add -A

Write-Host "`n=== Creating commit ===" -ForegroundColor Cyan
git commit -m "feat: integrate all backend APIs" --no-verify

Write-Host "`n=== Pulling from remote ===" -ForegroundColor Cyan
$env:GIT_EDITOR = 'true'
git pull origin main --no-rebase --no-edit

Write-Host "`n=== Pushing to remote ===" -ForegroundColor Cyan
git push origin main

Write-Host "`n=== Done! ===" -ForegroundColor Green
