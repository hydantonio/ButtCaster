
ButtCaster — Patch v53 (beta-revisions)
--------------------------------------
Fix inclusi:
- Intiface/Buttplug per Node con connector corretto (fallback legacy) → niente più "is not a constructor"
- Lista device con scan iniziale + aggiornamenti live e badge vibrate-capable
- Drag&Drop fluido con snap (Shift) e senza conflitti di variabili
- Sidebar destra pulita; icone nel menu sinistro (SVG locali)
- Overlay 1920×1080 allineato in basso, trasparente per OBS

Come applicare:
1) Scegli runtime server usato dalla tua repo:
   - **ESM**: copia `server/index.esm.js` → `server/index.js` e `server/intiface.esm.js` → `server/intiface.js`. Assicurati `package.json` contenga `"type":"module"`.
   - **CommonJS**: copia `server/cjs/index.cjs` → `server/index.js` e `server/cjs/intiface.cjs` → `server/intiface.js`. Rimuovi `"type":"module"` dal `package.json`.
2) UI: usa **public/** oppure **web/** (in base alla tua repo) e copia:
   - `js/control.js`, `css/control.css`, `css/overlay.css`, `overlay.html`, `img/icons/*`, `img/watermark.svg`
3) Installa e avvia:
   ```bash
   npm i
   node server/index.js
   ```
4) Test rapido:
   - Control: `http://localhost:3000/control.html`
   - Overlay (OBS): `http://localhost:3000/overlay.html` (sorgente browser, sfondo trasparente)
   - Intiface: `POST /api/intiface/connect` body `{ "url":"ws://127.0.0.1:12345" }` oppure usa il pannello Devices
   - Tip demo: `POST /api/emit-tip` → avanza goal + vibrazione device (se `VibrateCmd`)

Debug connettore:
- Esegui `node server/tools/connector-selftest.js` per vedere quali connector espone la tua versione di `buttplug`.
