$body = @{title='retrytest';description='test retry';complexity='simple'} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:3000/api/tasks' -Method Post -ContentType 'application/json' -Body $body
