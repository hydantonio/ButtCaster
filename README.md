
# ButtCaster v32.0 — Full

- Electron (Chromium) app con server interno.
- Intiface/Buttplug integrazione.
- Adapters piattaforme (Chaturbate longpoll/WS generico).
- Editor Overlay (drag & snap, text/badge/timer/counter/image) + overlay live 1920x1080 con widgets:
  - Counter bar (goal)
  - Timer (countdown + accumulator)
  - Top Supporter
  - Effetti: confetti su tip
- Mapping tip → pattern con pattern player.

## Avvio
```bash
npm install
npm start
```
Windows: `Start-ButtCaster.bat`.

## Build .exe
```bash
npm run build
```
Il pacchetto usa electron-builder (target NSIS).

## Config
Controllo in app:
- Settings → Intiface, Chaturbate (URL / WS, token, enable).
- Overlay → editor + Save overlay.
- Mappings → regole predefinite già caricate.

## Note su Chaturbate
Il modulo supporta un **endpoint personalizzato** (WS o HTTP longpoll) che emette JSON in forma:
```json
{ "type": "tip", "user": "nickname", "amount": 123 }
```
Inserisci l'URL in Settings/Chaturbate e abilita; il bus unifica gli eventi e li mappa su haptics/effects.
