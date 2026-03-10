$body = @{
    id = "agent1"
    name = "TestAgent"
    model = "test"
    capabilities = @("simple", "medium")
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:3000/api/agents/register' -Method Post -ContentType 'application/json' -Body $body
