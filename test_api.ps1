$uri = "http://127.0.0.1:5000/api/recommendations/tutors"

function Test-Api {
    param([hashtable]$bodyObj, [string]$testName)
    Write-Host "--- Test: $testName ---"
    $bodyJson = $bodyObj | ConvertTo-Json -Depth 5
    try {
        $response = Invoke-RestMethod -Uri $uri -Method Post -Body $bodyJson -ContentType "application/json"
        Write-Host "SUCCESS"
    } catch {
        Write-Host "FAILED with error: $_"
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            Write-Host "Response body: $($reader.ReadToEnd())"
        }
    }
}

$baseUser = @{
    id = 10
    fullname = "Noa RISPAL"
    hourly_rate = 40
    subject = "Computer Science"
    level = "undergraduate"
    preferred_learning_mode = "Online"
    special_needs = "None"
    location = ""
    email = "noa.rispal@mail.com"
    gpa = 3.7
    query = "Test query"
}

# Test 1: ID as UUID string
$test1User = $baseUser.Clone()
$test1User.id = "123e4567-e89b-12d3-a456-426614174000"
Test-Api -bodyObj @{ strategy = "hybrid"; n_recommendations = 5; user = $test1User } -testName "ID as String UUID"

# Test 2: Name changed
$test2User = $baseUser.Clone()
$test2User.fullname = "John Doe"
Test-Api -bodyObj @{ strategy = "hybrid"; n_recommendations = 5; user = $test2User } -testName "Name changed"

# Test 3: Null location and special_needs (frontend might send null/empty)
$test3User = $baseUser.Clone()
$test3User.id = 15
$test3User.location = $null
$test3User.special_needs = $null
Test-Api -bodyObj @{ strategy = "hybrid"; n_recommendations = 5; user = $test3User } -testName "Null location and special_needs"

# Test 4: Subject missing or null
$test4User = $baseUser.Clone()
$test4User.subject = $null
Test-Api -bodyObj @{ strategy = "hybrid"; n_recommendations = 5; user = $test4User } -testName "Null subject"
