$body = @{
    id = "agent2"
    name = "ComplexAgent"
    model = "complex"
    capabilities = @("complex")
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:3000/api/agents/register' -Method Post -ContentType 'application/json' -Body $body

# 创建复杂任务
$taskBody = @{
    title = "复杂任务"
    description = "测试复杂任务"
    complexity = "complex"
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:3000/api/tasks' -Method Post -ContentType 'application/json' -Body $taskBody
