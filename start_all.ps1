# ===========================
# start_all_single.ps1 - SCADA Semáforo + cámara
# ===========================

# 1️⃣ Iniciar MediaMTX
Write-Host "Iniciando MediaMTX..."
Set-Location "C:\Users\Juan\scada-template\mediamtx"
Start-Process -FilePath ".\mediamtx.exe" -NoNewWindow
Start-Sleep -Seconds 2

# 2️⃣ Publicar webcam con FFmpeg
Write-Host "Publicando webcam con FFmpeg..."
Set-Location "C:\Users\Juan\scada-template"
$ffmpegArgs = '-f dshow -rtbufsize 256M -i video="Integrated Webcam" -vcodec libx264 -pix_fmt yuv420p -preset ultrafast -tune zerolatency -x264opts keyint=30:min-keyint=30:no-scenecut -rtsp_transport tcp -f rtsp rtsp://127.0.0.1:8554/players/mystream'
Start-Process -FilePath ".\ffmpeg\bin\ffmpeg.exe" -ArgumentList $ffmpegArgs -NoNewWindow
Start-Sleep -Seconds 2

# 3️⃣ Abrir navegador automáticamente
Write-Host "Abriendo navegador en http://localhost:3001..."
Start-Process "http://localhost:3001"
Start-Sleep -Seconds 2

# 4️⃣ Iniciar MQTT Bridge en otra ventana
Write-Host "Iniciando MQTT Bridge en una nueva ventana..."
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd "C:\Users\Juan\scada-template\mqtt-bridge"; node bridge.mjs'
Start-Sleep -Seconds 2

# 5️⃣ Iniciar backend Node.js
Write-Host "Iniciando backend Node en esta misma ventana..."
Set-Location "C:\Users\Juan\scada-template\backend"
node server.mjs
