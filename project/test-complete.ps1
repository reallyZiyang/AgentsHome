# 测试任务状态更新 - 完成
$body = @{
    status = "completed"
    result = @{output = "任务完成"; success = $true}
    agentId = "agent1"
} | ConvertTo-Json

$taskId = "99fd88eb-a6b5-4330-9a1d-2bfdc9e08d1f"
Invoke-RestMethod -Uri "http://localhost:3000/api/tasks/$taskId/status" -Method Post -ContentType 'application/json' -Body $body
