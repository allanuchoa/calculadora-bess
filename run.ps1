# run.ps1 - Inicia um servidor local e abre no navegador para teste da Calculadora BESS
$port = 8000
$url = "http://localhost:$port"

Write-Host "Iniciando servidor local para teste da Calculadora BESS..." -ForegroundColor Green

# Tenta com Python
if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "Python encontrado. Subindo servidor na porta $port..." -ForegroundColor Cyan
    Start-Process "python" -ArgumentList "-m http.server $port" -NoNewWindow
    Start-Sleep -Seconds 1
    Start-Process $url
    Write-Host "Servidor ativo em: $url" -ForegroundColor Green
    Write-Host "Pressione Ctrl+C na janela do terminal para encerrar."
}
# Se não, tenta com Node.js (npx http-server)
elseif (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "Node.js encontrado. Subindo servidor com npx http-server na porta $port..." -ForegroundColor Cyan
    Start-Process "npx" -ArgumentList "http-server -p $port" -NoNewWindow
    Start-Sleep -Seconds 2
    Start-Process $url
    Write-Host "Servidor ativo em: $url" -ForegroundColor Green
    Write-Host "Pressione Ctrl+C na janela do terminal para encerrar."
}
# Se nenhum dos dois estiver disponível, abre o arquivo index.html diretamente via file://
else {
    Write-Host "Nem Python nem Node.js foram encontrados." -ForegroundColor Yellow
    Write-Host "Abrindo index.html diretamente no navegador..." -ForegroundColor Cyan
    $indexPath = Join-Path (Get-Location) "index.html"
    # Corrige barras para formato de URL do Windows
    $indexPath = $indexPath.Replace("\", "/")
    Start-Process "file:///$indexPath"
}
