$body = @{id='agent1'} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:3000/api/agents/heartbeat' -Method Post -ContentType 'application/json' -Body $body

$body2 = @{id='agent2'} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:3000/api/agents/heartbeat' -Method Post -ContentType 'application/json' -Body $body2

Write-Host "Heartbeats sent"
