param(
  [string]$Bucket = 'yuktinai-web-prod',
  [string]$Profile = 'yuktinai',
  [string]$DistributionId = 'E2XZDY8ZSTMPP7'
)

$ErrorActionPreference = 'Stop'
$siteRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

if (!(Get-Command aws -ErrorAction SilentlyContinue)) {
  throw 'AWS CLI is not available on PATH.'
}

Push-Location $siteRoot
try {
  Write-Host "Syncing website to s3://$Bucket ..." -ForegroundColor Cyan
  & aws s3 sync . "s3://$Bucket" `
    --profile $Profile `
    --delete `
    --exclude '*' `
    --include '*.html' `
    --include 'assets/css/*' `
    --include 'assets/js/*' `
    --include 'assets/images/logo-mark.svg' `
    --include 'assets/images/hero-bg.png'

  if ($LASTEXITCODE -ne 0) {
    throw "S3 sync failed with exit code $LASTEXITCODE. CloudFront was not invalidated."
  }

  Write-Host "Invalidating CloudFront distribution $DistributionId ..." -ForegroundColor Cyan
  & aws cloudfront create-invalidation `
    --distribution-id $DistributionId `
    --paths '/*' `
    --profile $Profile

  if ($LASTEXITCODE -ne 0) {
    throw "CloudFront invalidation failed with exit code $LASTEXITCODE."
  }

  Write-Host 'Website deployment completed.' -ForegroundColor Green
} finally {
  Pop-Location
}
