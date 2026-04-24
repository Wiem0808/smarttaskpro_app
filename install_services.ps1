# ============================================================
#  SMARTTASK PRO - Installation des Services Permanents v4
#  Methode: Scheduled Tasks Windows (DEFINITIVE)
#  - Processes are FULLY DETACHED from any terminal
#  - Watchdog uses Mutex for single-instance guarantee
#  - Child processes created via WMI (not parent-child)
#  - Survives: closing Antigravity, closing PowerShell, logoff
# ============================================================

$ErrorActionPreference = "Continue"

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $ProjectDir "backend"
$LogDir     = Join-Path $ProjectDir "logs"
$StartupDir = [Environment]::GetFolderPath("Startup")

if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

Write-Host ""
Write-Host "  +==================================================+" -ForegroundColor Cyan
Write-Host "  |  SMARTTASK PRO - Installation Services v4         |" -ForegroundColor Cyan
Write-Host "  |  Methode: Task Scheduler + WMI (DEFINITIVE)       |" -ForegroundColor Cyan
Write-Host "  +==================================================+" -ForegroundColor Cyan
Write-Host ""

# ── 0. KILL everything first ──
Write-Host "  [*] Arret de TOUS les anciens processus..." -ForegroundColor Yellow

# Remove old Startup VBS files (obsolete method)
Remove-Item (Join-Path $StartupDir "SmartTask_Backend.vbs") -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $StartupDir "SmartTask_Frontend.vbs") -Force -ErrorAction SilentlyContinue

# Remove old scheduled tasks if they exist
schtasks /Delete /TN "SmartTask_Backend_Watchdog" /F 2>$null | Out-Null
schtasks /Delete /TN "SmartTask_Frontend_Watchdog" /F 2>$null | Out-Null

# Kill all watchdog-related PowerShell processes (not ourselves)
for ($round = 1; $round -le 3; $round++) {
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $_.ProcessId -ne $PID -and $_.CommandLine -and 
        ($_.CommandLine -match "backend_service\.ps1" -or $_.CommandLine -match "frontend_service\.ps1" -or 
         $_.CommandLine -match "watchdog" -or $_.CommandLine -match "vite_watchdog")
    } | ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
    # Kill python on backend port
    Get-NetTCPConnection -LocalPort 8150 -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    # Kill vite on frontend port
    Get-NetTCPConnection -LocalPort 5174 -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep 2
}

Write-Host "  [OK] Anciens processus arretes" -ForegroundColor Green

# ── 1. Create Backend Watchdog Script ──
$backendServiceScript = Join-Path $LogDir "backend_service.ps1"

$backendContent = @"
# ============================================================
#  SmartTask Pro - Backend Watchdog v4 (DEFINITIVE)
#  Uses WMI Win32_Process.Create for FULLY DETACHED processes
#  Uses named mutex for single-instance guarantee
#  Survives terminal/Antigravity closure
# ============================================================
`$ErrorActionPreference = "Continue"

`$BackendDir    = "$BackendDir"
`$LogFile       = "$LogDir\backend_service.log"
`$LockFile      = "$LogDir\backend_watchdog.lock"
`$ServerScript  = Join-Path `$BackendDir "main.py"
`$ServerPort    = 8150
`$CheckInterval = 15

function Write-Log {
    param([string]`$Message)
    `$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    try { Add-Content -Path `$LogFile -Value "`$ts - `$Message" -Encoding UTF8 } catch {}
}

function Test-PortListening {
    return (`$null -ne (Get-NetTCPConnection -LocalPort `$ServerPort -State Listen -ErrorAction SilentlyContinue))
}

# ── SINGLE INSTANCE via Named Mutex ──
`$mutexName = "Global\SmartTaskBackendWatchdog"
`$createdNew = `$false
try {
    `$mutex = New-Object System.Threading.Mutex(`$true, `$mutexName, [ref]`$createdNew)
} catch {
    exit 0
}

if (-not `$createdNew) {
    if (`$mutex) { `$mutex.ReleaseMutex(); `$mutex.Dispose() }
    exit 0
}

`$PID | Out-File `$LockFile -Encoding ASCII -Force

Write-Log "============================================="
Write-Log "Backend Watchdog v4 STARTED (PID: `$PID)"
Write-Log "============================================="

`$restartCount = 0
`$rapidCrashCount = 0

try {
    while (`$true) {
        if (Test-PortListening) {
            Write-Log "Backend is LISTENING on port `$ServerPort - monitoring..."
            `$rapidCrashCount = 0
            while (Test-PortListening) {
                Start-Sleep -Seconds `$CheckInterval
            }
            Write-Log "Backend STOPPED listening - will restart"
            Start-Sleep 3
        }

        `$restartCount++
        `$startTime = Get-Date
        Write-Log "Starting backend (attempt #`$restartCount)..."

        # Kill any zombie on the port first
        Get-NetTCPConnection -LocalPort `$ServerPort -ErrorAction SilentlyContinue | ForEach-Object {
            try { Stop-Process -Id `$_.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
        }
        Start-Sleep 2

        # ── Launch python as a FULLY DETACHED process via WMI ──
        try {
            `$pythonExe = (Get-Command python -ErrorAction Stop).Source
            `$cmdLine = "```"`$pythonExe```" ```"`$ServerScript```""

            `$startupInfo = ([wmiclass]"Win32_ProcessStartup").CreateInstance()
            `$startupInfo.ShowWindow = 0
            `$startupInfo.CreateFlags = 0x00000010

            `$result = ([wmiclass]"Win32_Process").Create(`$cmdLine, `$BackendDir, `$startupInfo)

            if (`$result.ReturnValue -eq 0) {
                `$childPid = `$result.ProcessId
                Write-Log "Backend started via WMI - PID `$childPid (DETACHED)"

                `$ready = `$false
                for (`$w = 0; `$w -lt 30; `$w++) {
                    Start-Sleep 1
                    if (Test-PortListening) {
                        `$ready = `$true
                        Write-Log "Backend LISTENING (took `$(`$w+1)s)"
                        break
                    }
                    if (-not (Get-Process -Id `$childPid -ErrorAction SilentlyContinue)) {
                        Write-Log "Process `$childPid died before listening"
                        break
                    }
                }

                if (`$ready) {
                    `$rapidCrashCount = 0
                    while (Test-PortListening) {
                        Start-Sleep -Seconds `$CheckInterval
                    }
                    Write-Log "Backend stopped listening"
                }
            } else {
                Write-Log "WMI Process.Create failed with code `$(`$result.ReturnValue)"
            }
        }
        catch {
            Write-Log "ERROR starting backend: `$(`$_.Exception.Message)"
        }

        `$dur = (Get-Date) - `$startTime
        if (`$dur.TotalSeconds -lt 15) {
            `$rapidCrashCount++
            Write-Log "Rapid crash #`$rapidCrashCount"
            if (`$rapidCrashCount -ge 5) {
                Write-Log "5 rapid crashes - backing off 60s"
                Start-Sleep 60
                `$rapidCrashCount = 0
            }
        }

        Write-Log "Restarting in 5s..."
        Start-Sleep 5
    }
}
finally {
    try { `$mutex.ReleaseMutex() } catch {}
    try { `$mutex.Dispose() } catch {}
    Remove-Item `$LockFile -Force -ErrorAction SilentlyContinue
    Write-Log "Watchdog STOPPED (PID `$PID)"
}
"@
$backendContent | Out-File -FilePath $backendServiceScript -Encoding UTF8 -Force
Write-Host "  [OK] Backend watchdog v4 cree" -ForegroundColor Green

# ── 2. Create Frontend Watchdog Script ──
$frontendServiceScript = Join-Path $LogDir "frontend_service.ps1"

$frontendContent = @"
# ============================================================
#  SmartTask Pro - Frontend Watchdog v4 (DEFINITIVE)
#  Uses WMI Win32_Process.Create for FULLY DETACHED processes
#  Uses named mutex for single-instance guarantee
#  Survives terminal/Antigravity closure
# ============================================================
`$ErrorActionPreference = "Continue"

`$ProjectDir    = "$ProjectDir"
`$LogFile       = "$LogDir\frontend_service.log"
`$LockFile      = "$LogDir\frontend_watchdog.lock"
`$FrontPort     = 5174
`$CheckInterval = 15

function Write-Log {
    param([string]`$Message)
    `$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    try { Add-Content -Path `$LogFile -Value "`$ts - `$Message" -Encoding UTF8 } catch {}
}

function Test-PortListening {
    return (`$null -ne (Get-NetTCPConnection -LocalPort `$FrontPort -State Listen -ErrorAction SilentlyContinue))
}

# ── SINGLE INSTANCE via Named Mutex ──
`$mutexName = "Global\SmartTaskFrontendWatchdog"
`$createdNew = `$false
try {
    `$mutex = New-Object System.Threading.Mutex(`$true, `$mutexName, [ref]`$createdNew)
} catch {
    exit 0
}

if (-not `$createdNew) {
    if (`$mutex) { `$mutex.ReleaseMutex(); `$mutex.Dispose() }
    exit 0
}

`$PID | Out-File `$LockFile -Encoding ASCII -Force

Write-Log "============================================="
Write-Log "Frontend Watchdog v4 STARTED (PID: `$PID)"
Write-Log "============================================="

`$restartCount = 0
`$rapidCrashCount = 0

try {
    while (`$true) {
        if (Test-PortListening) {
            Write-Log "Frontend is LISTENING on port `$FrontPort - monitoring..."
            `$rapidCrashCount = 0
            while (Test-PortListening) {
                Start-Sleep -Seconds `$CheckInterval
            }
            Write-Log "Frontend STOPPED listening - will restart"
            Start-Sleep 3
        }

        `$restartCount++
        `$startTime = Get-Date
        Write-Log "Starting Vite (attempt #`$restartCount)..."

        Get-NetTCPConnection -LocalPort `$FrontPort -ErrorAction SilentlyContinue | ForEach-Object {
            try { Stop-Process -Id `$_.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
        }
        Start-Sleep 2

        # ── Launch Vite as a FULLY DETACHED process via WMI ──
        try {
            `$cmdLine = "cmd.exe /c cd /d ```"`$ProjectDir```" && npx vite --host 0.0.0.0 --port `$FrontPort"

            `$startupInfo = ([wmiclass]"Win32_ProcessStartup").CreateInstance()
            `$startupInfo.ShowWindow = 0
            `$startupInfo.CreateFlags = 0x00000010

            `$result = ([wmiclass]"Win32_Process").Create(`$cmdLine, `$ProjectDir, `$startupInfo)

            if (`$result.ReturnValue -eq 0) {
                `$childPid = `$result.ProcessId
                Write-Log "Vite started via WMI - PID `$childPid (DETACHED)"

                `$ready = `$false
                for (`$w = 0; `$w -lt 30; `$w++) {
                    Start-Sleep 1
                    if (Test-PortListening) {
                        `$ready = `$true
                        Write-Log "Frontend LISTENING (took `$(`$w+1)s)"
                        break
                    }
                }

                if (`$ready) {
                    `$rapidCrashCount = 0
                    while (Test-PortListening) {
                        Start-Sleep -Seconds `$CheckInterval
                    }
                    Write-Log "Frontend stopped listening"
                }
            } else {
                Write-Log "WMI Process.Create failed with code `$(`$result.ReturnValue)"
            }
        }
        catch {
            Write-Log "ERROR starting Vite: `$(`$_.Exception.Message)"
        }

        `$dur = (Get-Date) - `$startTime
        if (`$dur.TotalSeconds -lt 15) {
            `$rapidCrashCount++
            Write-Log "Rapid crash #`$rapidCrashCount"
            if (`$rapidCrashCount -ge 5) {
                Write-Log "5 rapid crashes - backing off 60s"
                Start-Sleep 60
                `$rapidCrashCount = 0
            }
        }

        Write-Log "Restarting in 5s..."
        Start-Sleep 5
    }
}
finally {
    try { `$mutex.ReleaseMutex() } catch {}
    try { `$mutex.Dispose() } catch {}
    Remove-Item `$LockFile -Force -ErrorAction SilentlyContinue
    Write-Log "Frontend Watchdog STOPPED (PID `$PID)"
}
"@
$frontendContent | Out-File -FilePath $frontendServiceScript -Encoding UTF8 -Force
Write-Host "  [OK] Frontend watchdog v4 cree" -ForegroundColor Green

# ── 3. Clear old logs and lock files ──
"" | Out-File (Join-Path $LogDir "backend_service.log") -Force
"" | Out-File (Join-Path $LogDir "frontend_service.log") -Force
Remove-Item (Join-Path $LogDir "backend_watchdog.lock") -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $LogDir "frontend_watchdog.lock") -Force -ErrorAction SilentlyContinue

# ── 4. Create Scheduled Tasks (truly detached from any terminal) ──
Write-Host ""
Write-Host "  [*] Creation des taches planifiees Windows..." -ForegroundColor Yellow

$backendTaskXml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>SmartTask Pro - Backend Watchdog (permanent)</Description>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal>
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>7</Priority>
    <RestartOnFailure>
      <Interval>PT1M</Interval>
      <Count>999</Count>
    </RestartOnFailure>
  </Settings>
  <Actions>
    <Exec>
      <Command>powershell.exe</Command>
      <Arguments>-ExecutionPolicy Bypass -WindowStyle Hidden -NonInteractive -File "$backendServiceScript"</Arguments>
      <WorkingDirectory>$BackendDir</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
"@

$frontendTaskXml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>SmartTask Pro - Frontend Watchdog (permanent)</Description>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal>
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>7</Priority>
    <RestartOnFailure>
      <Interval>PT1M</Interval>
      <Count>999</Count>
    </RestartOnFailure>
  </Settings>
  <Actions>
    <Exec>
      <Command>powershell.exe</Command>
      <Arguments>-ExecutionPolicy Bypass -WindowStyle Hidden -NonInteractive -File "$frontendServiceScript"</Arguments>
      <WorkingDirectory>$ProjectDir</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
"@

# Save XML files
$backendXmlPath = Join-Path $LogDir "backend_task.xml"
$frontendXmlPath = Join-Path $LogDir "frontend_task.xml"
$backendTaskXml | Out-File $backendXmlPath -Encoding Unicode -Force
$frontendTaskXml | Out-File $frontendXmlPath -Encoding Unicode -Force

# Register scheduled tasks
schtasks /Create /TN "SmartTask_Backend_Watchdog" /XML "$backendXmlPath" /F 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Tache planifiee Backend creee" -ForegroundColor Green
} else {
    Write-Host "  [!] Tache planifiee Backend - utilisation de Startup fallback" -ForegroundColor Yellow
    # Fallback to startup VBS
    $backendVbs = Join-Path $StartupDir "SmartTask_Backend.vbs"
    $vbsContent = "Set s = CreateObject(""WScript.Shell"")`r`ns.Run ""powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -NonInteractive -File """"$backendServiceScript"""""", 0, False`r`n"
    [System.IO.File]::WriteAllText($backendVbs, $vbsContent, [System.Text.Encoding]::ASCII)
}

schtasks /Create /TN "SmartTask_Frontend_Watchdog" /XML "$frontendXmlPath" /F 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Tache planifiee Frontend creee" -ForegroundColor Green
} else {
    Write-Host "  [!] Tache planifiee Frontend - utilisation de Startup fallback" -ForegroundColor Yellow
    $frontendVbs = Join-Path $StartupDir "SmartTask_Frontend.vbs"
    $vbsContent = "Set s = CreateObject(""WScript.Shell"")`r`ns.Run ""powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -NonInteractive -File """"$frontendServiceScript"""""", 0, False`r`n"
    [System.IO.File]::WriteAllText($frontendVbs, $vbsContent, [System.Text.Encoding]::ASCII)
}

# ── 5. Start services NOW via schtasks /Run ──
Write-Host ""
Write-Host "  [*] Demarrage des services..." -ForegroundColor Yellow

# Try starting via scheduled tasks first
$backendStarted = $false
$frontendStarted = $false

schtasks /Run /TN "SmartTask_Backend_Watchdog" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    $backendStarted = $true
}

schtasks /Run /TN "SmartTask_Frontend_Watchdog" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    $frontendStarted = $true
}

# Fallback: start directly if schtasks failed
if (-not $backendStarted) {
    Write-Host "  [*] Demarrage direct du backend watchdog..." -ForegroundColor Yellow
    $wmiResult = ([wmiclass]"Win32_Process").Create(
        "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -NonInteractive -File `"$backendServiceScript`"",
        $BackendDir,
        $null
    )
    if ($wmiResult.ReturnValue -eq 0) { $backendStarted = $true }
}

if (-not $frontendStarted) {
    Write-Host "  [*] Demarrage direct du frontend watchdog..." -ForegroundColor Yellow
    $wmiResult = ([wmiclass]"Win32_Process").Create(
        "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -NonInteractive -File `"$frontendServiceScript`"",
        $ProjectDir,
        $null
    )
    if ($wmiResult.ReturnValue -eq 0) { $frontendStarted = $true }
}

# Wait for ports
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep 1
    $backOk = $null -ne (Get-NetTCPConnection -LocalPort 8150 -State Listen -ErrorAction SilentlyContinue)
    $frontOk = $null -ne (Get-NetTCPConnection -LocalPort 5174 -State Listen -ErrorAction SilentlyContinue)
    Write-Host "`r  [*] Attente... ${i}s  Backend=$backOk  Frontend=$frontOk   " -NoNewline -ForegroundColor Yellow
    if ($backOk -and $frontOk) { break }
}
Write-Host ""

# ── 6. Firewall (ignore if not Admin) ──
try {
    netsh advfirewall firewall delete rule name="SmartTask Vite 5174"    2>$null | Out-Null
    netsh advfirewall firewall delete rule name="SmartTask Backend 8150" 2>$null | Out-Null
    netsh advfirewall firewall add rule name="SmartTask Vite 5174"    dir=in action=allow protocol=TCP localport=5174 profile=any 2>$null | Out-Null
    netsh advfirewall firewall add rule name="SmartTask Backend 8150" dir=in action=allow protocol=TCP localport=8150 profile=any 2>$null | Out-Null
} catch {}

# ── 7. Open browser ──
Start-Process "http://localhost:5174"

# ── 8. Summary ──
Write-Host ""
Write-Host "  +==================================================+" -ForegroundColor Green
Write-Host "  |         INSTALLATION TERMINEE (v4)                 |" -ForegroundColor Green
Write-Host "  +==================================================+" -ForegroundColor Green
Write-Host ""
Write-Host "  Les services SmartTask sont maintenant PERMANENTS :" -ForegroundColor White
Write-Host "    - Taches planifiees Windows (Task Scheduler)" -ForegroundColor DarkGray
Write-Host "    - Mutex pour single-instance (pas de doublons)" -ForegroundColor DarkGray
Write-Host "    - WMI pour processes detaches (pas de parent-child)" -ForegroundColor DarkGray
Write-Host "    - Demarrage auto a la connexion Windows" -ForegroundColor DarkGray
Write-Host "    - SURVIVE: fermeture Antigravity, PowerShell, terminal" -ForegroundColor DarkGray
Write-Host ""

$backOk  = $null -ne (Get-NetTCPConnection -LocalPort 8150 -State Listen -ErrorAction SilentlyContinue)
$frontOk = $null -ne (Get-NetTCPConnection -LocalPort 5174 -State Listen -ErrorAction SilentlyContinue)
if ($backOk)  { Write-Host "  Backend  : ACTIF  http://localhost:8150" -ForegroundColor Green }
else          { Write-Host "  Backend  : En demarrage..." -ForegroundColor Yellow }
if ($frontOk) { Write-Host "  Frontend : ACTIF  http://localhost:5174" -ForegroundColor Green }
else          { Write-Host "  Frontend : En demarrage..." -ForegroundColor Yellow }

Write-Host ""
