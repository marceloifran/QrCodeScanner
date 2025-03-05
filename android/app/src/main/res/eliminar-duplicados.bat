@echo off
REM Eliminar archivos PNG duplicados en las carpetas mipmap
del /Q "C:\Users\PC\Desktop\QrCodeScanner\android\app\src\main\res\mipmap-hdpi\ic_launcher.png"
del /Q "C:\Users\PC\Desktop\QrCodeScanner\android\app\src\main\res\mipmap-hdpi\ic_launcher_round.png"
del /Q "C:\Users\PC\Desktop\QrCodeScanner\android\app\src\main\res\mipmap-mdpi\ic_launcher.png"
del /Q "C:\Users\PC\Desktop\QrCodeScanner\android\app\src\main\res\mipmap-mdpi\ic_launcher_round.png"
del /Q "C:\Users\PC\Desktop\QrCodeScanner\android\app\src\main\res\mipmap-xhdpi\ic_launcher.png"
del /Q "C:\Users\PC\Desktop\QrCodeScanner\android\app\src\main\res\mipmap-xhdpi\ic_launcher_round.png"
del /Q "C:\Users\PC\Desktop\QrCodeScanner\android\app\src\main\res\mipmap-xxhdpi\ic_launcher.png"
del /Q "C:\Users\PC\Desktop\QrCodeScanner\android\app\src\main\res\mipmap-xxhdpi\ic_launcher_round.png"
del /Q "C:\Users\PC\Desktop\QrCodeScanner\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png"
del /Q "C:\Users\PC\Desktop\QrCodeScanner\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_round.png"
echo Archivos PNG duplicados eliminados correctamente. 