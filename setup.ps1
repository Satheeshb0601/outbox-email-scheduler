# ONG Mail - Windows Setup Script
# Run this script as Administrator in PowerShell

Write-Host "========================================" -ForegroundColor Green
Write-Host "  ONG Mail - Setup Script" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Check if PostgreSQL is running
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($pgService -and $pgService.Status -eq "Running") {
    Write-Host "✅ PostgreSQL is running" -ForegroundColor Green
} else {
    Write-Host "⚠️  Starting PostgreSQL service..." -ForegroundColor Yellow
    Start-Service -Name "postgresql*" -ErrorAction SilentlyContinue
}

# Check if Redis is running
$redisService = Get-Service -Name "Redis*" -ErrorAction SilentlyContinue
if ($redisService -and $redisService.Status -eq "Running") {
    Write-Host "✅ Redis is running" -ForegroundColor Green
} else {
    Write-Host "⚠️  Starting Redis service..." -ForegroundColor Yellow
    Start-Service -Name "Redis*" -ErrorAction SilentlyContinue
}

# Create PostgreSQL database and user
Write-Host "Setting up PostgreSQL database..." -ForegroundColor Cyan
$createDbScript = @"
DO
\$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'outbox_user') THEN
      CREATE USER outbox_user WITH PASSWORD 'outbox_pass';
   END IF;
END
\$\$;
CREATE DATABASE outbox_db OWNER outbox_user;
GRANT ALL PRIVILEGES ON DATABASE outbox_db TO outbox_user;
"@

$createDbScript | psql -U postgres -c $createDbScript 2>&1

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Now run:" -ForegroundColor Cyan
Write-Host "  Terminal 1: cd backend && npm run dev" -ForegroundColor White
Write-Host "  Terminal 2: cd backend && npm run worker" -ForegroundColor White
Write-Host "  Terminal 3: cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "URLs:" -ForegroundColor Cyan
Write-Host "  Frontend:   http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:    http://localhost:3001" -ForegroundColor White
Write-Host "  Bull Board: http://localhost:3001/admin/queues" -ForegroundColor White
