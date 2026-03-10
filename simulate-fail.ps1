# 模拟失败
$body = @{
    status = "failed"
    result = @{error = "test error"}
    agentId = "agent2"
} | ConvertTo-Json

$taskId = "8c52adef-0383-459f-b316-cb59a1a754e9"
Invoke-RestMethod -Uri "http://localhost:3000/api/tasks/$taskId/status" -Method Post -ContentType 'application/json' -Body $body
