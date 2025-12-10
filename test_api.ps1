$response = Invoke-WebRequest -Uri 'http://localhost:3000/api/Wallet/getloaned' -Method POST -Body '{"userid":"1765298563993"}' -ContentType 'application/json' -UseBasicParsing -TimeoutSec 60

Write-Output "Status Code: $($response.StatusCode)"
Write-Output "Response:"
Write-Output $response.Content
