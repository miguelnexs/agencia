$searchPaths = @("env", "venv", ".venv", "virtualenv")
$pythonPath = $null

foreach ($path in $searchPaths) {
    $tempPath = Join-Path $PSScriptRoot $path
    $tempPath = Join-Path $tempPath "Scripts"
    $fullPath = Join-Path $tempPath "python.exe"
    if (Test-Path $fullPath) {
        $pythonPath = $fullPath
        break
    }
}

if ($pythonPath) {
    Write-Host "Found Python at: $pythonPath"
    & $pythonPath manage.py runserver 0.0.0.0:8000
} else {
    Write-Error "Could not find a virtual environment in common paths."
}
