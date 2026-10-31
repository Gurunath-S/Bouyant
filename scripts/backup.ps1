# Resolve project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$BackupDir = Join-Path $RootDir "backups"

if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
}

$Timestamp = (Get-Date).ToString("yyyy-MM-dd_hh-mm-tt")

# Read DATABASE_URL from server/.env if available
$EnvFile = Join-Path $RootDir "server\.env"
$DbUrl = ""
if (Test-Path $EnvFile) {
    $DbUrlLine = Get-Content $EnvFile | Where-Object { $_ -match "^DATABASE_URL\s*=" } | Select-Object -First 1
    if ($DbUrlLine) {
        $DbUrl = ($DbUrlLine -replace '^DATABASE_URL\s*=\s*"?', '') -replace '"?\s*$', ''
    }
}

# Defaults
$HostName = "localhost"
$Port = "5432"
$User = "postgres"
$DbName = "bouyantGuruTest"

if ($DbUrl -match "postgresql://([^:]+):([^@]+)@([^:/]+):?(\d+)?/([^?]+)") {
    $User = $Matches[1]
    $env:PGPASSWORD = $Matches[2]
    $HostName = $Matches[3]
    if ($Matches[4]) { $Port = $Matches[4] }
    $DbName = $Matches[5]
}

$SqlFile = Join-Path $BackupDir "backup_${DbName}_${Timestamp}.sql"
$DumpFile = Join-Path $BackupDir "backup_${DbName}_${Timestamp}.dump"

# Find pg_dump
$PgDump = "pg_dump.exe"
if (Test-Path "C:\Program Files\PostgreSQL\13\bin\pg_dump.exe") {
    $PgDump = "C:\Program Files\PostgreSQL\13\bin\pg_dump.exe"
}

Write-Host "Backing up database '$DbName'..." -ForegroundColor Cyan
& $PgDump -U $User -h $HostName -p $Port -d $DbName --clean --if-exists -f $SqlFile
Write-Host "  Created SQL backup:  backups/$(Split-Path -Leaf $SqlFile)" -ForegroundColor Green

& $PgDump -U $User -h $HostName -p $Port -d $DbName -Fc -f $DumpFile
Write-Host "  Created Dump backup: backups/$(Split-Path -Leaf $DumpFile)" -ForegroundColor Green

Write-Host "All backups created successfully!" -ForegroundColor Green

