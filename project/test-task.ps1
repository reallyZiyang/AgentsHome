$body = @{title='测试任务';description='测试';complexity='simple'} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:3000/api/tasks' -Method Post -ContentType 'application/json' -Body $body
