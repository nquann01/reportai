$path = "C:\Users\Admin\.gemini\antigravity\scratch\"
$file = $path + "baocao.html"
$html = [System.IO.File]::ReadAllText($file)

$styleStart = $html.IndexOf("<style>")
$styleEnd = $html.IndexOf("</style>", $styleStart) + 8
$cssContent = $html.Substring($styleStart + 7, $styleEnd - $styleStart - 15).Trim()

$jsStartToken = "<script>`r`n  const SCRIPT_URL"
$jsStart = $html.IndexOf($jsStartToken)
if ($jsStart -eq -1) {
    $jsStartToken = "<script>`n  const SCRIPT_URL"
    $jsStart = $html.IndexOf($jsStartToken)
}

$jsEnd = $html.LastIndexOf("</script>")
$jsContent = $html.Substring($jsStart + 8, $jsEnd - $jsStart - 8).Trim()

$htmlContent = $html.Substring(0, $styleStart) + '  <link rel="stylesheet" href="style.css">' + "`n" + $html.Substring($styleEnd, $jsStart - $styleEnd)
$htmlContent = $htmlContent.Replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>', '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>' + "`n" + '<script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>')

$htmlContent += '<script src="script.js"></script>' + "`n</body>`n</html>`n"

[System.IO.File]::WriteAllText($path + "index.html", $htmlContent, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($path + "style.css", $cssContent, [System.Text.Encoding]::UTF8)

$regexAuth = '(?s)const ADMIN_TOKENS = \["zxc", "vi123"\];.*?if\s*\(ADMIN_TOKENS\.includes\(token\)\)\s*\{.*?sessionStorage\.setItem\(''user_role'',\s*''admin''\);.*?\}\s*else\s*\{.*?sessionStorage\.setItem\(''user_role'',\s*''staff''\);.*?\}'
$replacement = "if (data.role === 'admin') {`n        sessionStorage.setItem('user_role', 'admin');`n      } else {`n        sessionStorage.setItem('user_role', 'staff');`n      }"

$jsContent = $jsContent -replace $regexAuth, $replacement
[System.IO.File]::WriteAllText($path + "script.js", $jsContent, [System.Text.Encoding]::UTF8)

Write-Host "Split finished"
