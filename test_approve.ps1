$body = '{"id":"69389794f40d0c5392856a51"}'
$token = "eyJhbGciOiJITUFDLVNIQTI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbiI6dHJ1ZSwiaWQiOiI2OTM3OGRlNDI4M2VkZDQ0MzA5MDQzN2YiLCJuYW1lIjoiYWRtaW5fb25lIiwiaWF0IjoxNzY1MzE2NTAwLCJleHAiOjE3NjUzMTY1MDArODY0MDB9.bc90e6e0c8f7f9e9e9e9e9e9e9e9e9e9"

Write-Host "Testing approve endpoint..."

try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:3000/api/admin/topup/approve-mongo" `
        -Method PUT `
        -Headers @{"Authorization"="Bearer $token"} `
        -Body $body `
        -ContentType "application/json" `
        -UseBasicParsing
    
    Write-Host "Success!"
    Write-Host $response.Content
} catch {
    Write-Host "Error: $_"
}
