# ==========================================================================
# Native PowerShell Web Server for Aarthi Homes Kodaikanal
# ==========================================================================
# Runs on System.Net.HttpListener, zero dependencies needed.

$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "Local server running at: http://localhost:$port/" -ForegroundColor Green
    Write-Host "Press Ctrl+C in your terminal to stop the server." -ForegroundColor Yellow
} catch {
    Write-Error "Failed to start server. Port $port might be in use or requires admin permissions."
    Exit
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $urlPath = $request.Url.LocalPath
        $method = $request.HttpMethod

        # API endpoint: Add reservation inquiry
        if ($urlPath -eq "/api/inquiry" -and $method -eq "POST") {
            $body = ""
            if ($request.HasEntityBody) {
                $bodyStream = $request.InputStream
                $reader = New-Object System.IO.StreamReader($bodyStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                $reader.Close()
            }
            
            $dbPath = Join-Path (Get-Location) "inquiries.json"
            $inquiries = @()
            if (Test-Path $dbPath) {
                try {
                    $jsonContent = Get-Content -Raw $dbPath
                    if ($jsonContent.Trim()) {
                        $inquiries = ConvertFrom-Json $jsonContent
                        if ($inquiries -isnot [Array]) { $inquiries = ,$inquiries }
                    }
                } catch {
                    $inquiries = @()
                }
            }
            
            try {
                $newInquiry = ConvertFrom-Json $body
                
                # Assign ID and timestamp if not already provided
                if ($null -eq $newInquiry.id) {
                    $newInquiry | Add-Member -MemberType NoteProperty -Name "id" -Value ([guid]::NewGuid().ToString())
                }
                if ($null -eq $newInquiry.timestamp) {
                    $newInquiry | Add-Member -MemberType NoteProperty -Name "timestamp" -Value (Get-Date -Format "o")
                }
                
                $inquiries += $newInquiry
                $updatedJson = ConvertTo-Json $inquiries -Depth 10
                Set-Content -Path $dbPath -Value $updatedJson -Encoding UTF8
                
                $response.StatusCode = 200
                $response.ContentType = "application/json; charset=utf-8"
                $resJson = '{"success":true,"message":"Inquiry logged successfully"}'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($resJson)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } catch {
                $response.StatusCode = 400
                $response.ContentType = "application/json; charset=utf-8"
                $resJson = '{"success":false,"message":"Invalid JSON payload"}'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($resJson)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
        }
        # API endpoint: Retrieve all inquiries
        elseif ($urlPath -eq "/api/inquiries" -and $method -eq "GET") {
            $dbPath = Join-Path (Get-Location) "inquiries.json"
            $jsonContent = "[]"
            if (Test-Path $dbPath) {
                $jsonContent = Get-Content -Raw $dbPath
                if (-not $jsonContent.Trim()) { $jsonContent = "[]" }
            }
            
            $response.StatusCode = 200
            $response.ContentType = "application/json; charset=utf-8"
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonContent)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        # API endpoint: Delete an inquiry
        elseif ($urlPath -eq "/api/inquiry/delete" -and $method -eq "POST") {
            $body = ""
            if ($request.HasEntityBody) {
                $bodyStream = $request.InputStream
                $reader = New-Object System.IO.StreamReader($bodyStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                $reader.Close()
            }
            
            $dbPath = Join-Path (Get-Location) "inquiries.json"
            $inquiries = @()
            if (Test-Path $dbPath) {
                try {
                    $jsonContent = Get-Content -Raw $dbPath
                    if ($jsonContent.Trim()) {
                        $inquiries = ConvertFrom-Json $jsonContent
                        if ($inquiries -isnot [Array]) { $inquiries = ,$inquiries }
                    }
                } catch {}
            }
            
            try {
                $payload = ConvertFrom-Json $body
                $targetId = $payload.id
                
                $filtered = @()
                foreach ($item in $inquiries) {
                    if ($item.id -ne $targetId) {
                        $filtered += $item
                    }
                }
                
                $updatedJson = ConvertTo-Json $filtered -Depth 10
                Set-Content -Path $dbPath -Value $updatedJson -Encoding UTF8
                
                $response.StatusCode = 200
                $response.ContentType = "application/json; charset=utf-8"
                $resJson = '{"success":true,"message":"Inquiry deleted successfully"}'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($resJson)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } catch {
                $response.StatusCode = 400
                $response.ContentType = "application/json; charset=utf-8"
                $resJson = '{"success":false,"message":"Invalid request"}'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($resJson)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
        }
        # Static file serving
        else {
            if ($urlPath -eq "/") { $urlPath = "/index.html" }
            if ($urlPath -eq "/admin") { $urlPath = "/admin.html" }
            
            $relPath = $urlPath.TrimStart('/')
            $fullPath = Join-Path (Get-Location) $relPath
            
            if (Test-Path $fullPath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($fullPath)
                $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
                $contentType = switch ($ext) {
                    ".html" { "text/html; charset=utf-8" }
                    ".css"  { "text/css; charset=utf-8" }
                    ".js"   { "application/javascript; charset=utf-8" }
                    ".jpg"  { "image/jpeg" }
                    ".jpeg" { "image/jpeg" }
                    ".png"  { "image/png" }
                    ".svg"  { "image/svg+xml" }
                    default { "application/octet-stream" }
                }
                
                $response.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate")
                $response.Headers.Add("Pragma", "no-cache")
                $response.ContentType = $contentType
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $html = "<html><head><title>404 Not Found</title></head><body><h1>404 Not Found</h1><p>The file <b>$urlPath</b> could not be found in the workspace.</p></body></html>"
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($html)
                $response.ContentType = "text/html; charset=utf-8"
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
        }
    } catch {
        # Silent fail for individual closed connections (e.g. browser cancellations)
    } finally {
        if ($response) {
            try { $response.Close() } catch {}
        }
    }
}
