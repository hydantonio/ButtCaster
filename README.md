
# ButtCaster

OBS overlay + Intiface/Buttplug haptics controller, con adapters per piattaforme (Chaturbate, ecc.).
Questa build: **v31.1 — Electron + Overlay Editor**.

## Avvio
```bash
npm install
npm start   # apre l'app Chromium (Electron) + server
```

Oppure su Windows: `Start-ButtCaster.bat`.

## Cartelle
- `desktop/` – app Electron
- `server/` – API/Socket.IO + integrazione Buttplug + salvataggio stato
- `web/` – UI (control + overlay) statici
- `server/state.json` – persistenza impostazioni

## Sviluppo
- UI in vanilla JS + CSS, niente framework per semplicità.
- Haptics: Buttplug Websocket (`ws://host:port`).
- Overlay: 1920×1080, trasparente, elementi salvati in `state.overlay`.

## TODO
- Adapter eventi Chaturbate live (longpoll/WS)
- Editor overlay avanzato (layers, z-index, animazioni)
- Pattern editor
- Pacchettizzazione in .exe
