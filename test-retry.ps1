# 创建任务并模拟失败
$taskBody = @{
    title = "失败测试任务"
    description = "测试重试"
    complexity = "simple"
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri 'http://localhost:3000/api/tasks' -Method Post -ContentType 'application/json' -Body $taskBody
Write-Host "Created task:" $result.taskId

# 等待调度器分配
Start-Sleep -Seconds 2

# 模拟失败
$failBody = @{
    status = "failed"
    result = @{error = "测试失败"}
    agentId = "agent1"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/tasks/$($result.taskId)/status" -Method Post -ContentType 'application/json' -Body $failBody

# 测试重试
Start-Sleep -Seconds 1
$retryResult = Invoke-RestMethod -Uri "http://localhost:3000/api/tasks/$($result.taskId)/retry" -Method Post
Write-Host "Retry result:" $retryResult
