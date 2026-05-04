$url = "https://jaueqsyusdrzammjwfen.supabase.co/rest/v1/profiles?role=eq.teacher&select=*"
$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphdWVxc3l1c2RyemFtbWp3ZmVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDQ0ODcsImV4cCI6MjA5MjE4MDQ4N30.RjS-WpByb9oDSPujGXJukxFoxD5Tf9H5upwp0W8ndJo"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphdWVxc3l1c2RyemFtbWp3ZmVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDQ0ODcsImV4cCI6MjA5MjE4MDQ4N30.RjS-WpByb9oDSPujGXJukxFoxD5Tf9H5upwp0W8ndJo"
}
$response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
$response | Select-Object -First 2 | ConvertTo-Json -Depth 5
