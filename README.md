
# ButtCaster v48 — complete package

## Avvio (Windows)
- **App (Electron)**: `Start-ButtCaster-v48-App.bat` (splash → control). Prima volta installa Electron.
- **Browser**: `Start-ButtCaster-v48.bat` (server + apre il control). Log in `logs/server.log`.

## URL
- Control: `http://localhost:3000/control.html`
- Overlay (OBS): `http://localhost:3000/overlay.html` (trasparente, 1920×1080)

## Intiface
- Avvia Intiface Central → Start Scanning.
- In *Devices* → URL `ws://127.0.0.1:12345` → **Connect**.
- Slider/Pulse per testare i device. Mapping tip → vibrazione in **Mappings**.
- Il server ora seleziona automaticamente il connettore Buttplug più compatibile (Node, legacy o browser) evitando l'errore "is not a constructor".

## Note
- Server Node **CommonJS** con **buttplug** caricato **on-demand** (l’app parte anche senza).
- Editor con drag/resize su preview **960×540** mappato a **1920×1080**; overlay è sempre 1920×1080.
- Branding e splash già inclusi; watermark overlay togglabile in Settings/Overlay.
