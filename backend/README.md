# Akari Atlas: free, live travel companion

Static PWA (GitHub Pages) + optional free Google Apps Script backend.

## Live data sources (all free)
| Feature | Source | Key needed? |
|---|---|---|
| Animated weather + spoken announcements | Open-Meteo | No |
| Search-as-you-type (any place in Taiwan) | Photon / OpenStreetMap | No |
| Nearby cafés, food, Gundam/TCG/toy shops, gifts, tees, parks, bike rental, stations | Overpass / OpenStreetMap | No |
| Map | Leaflet + OpenStreetMap tiles | No |
| TWD→PHP rate (refreshes every 6 h) | open.er-api.com | No |
| Live TRA train boards + YouBike availability | Taiwan MOTC **TDX**, via your Apps Script | Free TDX account |
| Sync between both phones, data kept forever | Your Google Sheet, via Apps Script | No |

## 1. Put the app online (GitHub Pages)
1. Open github.com/naekitakadoportfolio/naekitakadoportfolio.github.io
2. **Add file → Upload files**. Create a folder `taiwan/` and upload every file here **except** `Code.gs` and `README.md`.
3. Commit. After about a minute the app is live at **https://naekitakadoportfolio.github.io/taiwan/**

## 2. Backend (sync + live transit): about 5 minutes
1. sheets.new → name it "Taiwan Trip Data" → **Extensions → Apps Script**.
2. Paste `Code.gs` → Save.
3. **Deploy → New deployment → Web app**. Execute as: **Me**. Who has access: **Anyone**. Deploy, authorize, then copy the `/exec` URL.
4. In the app: **Docs → Sync & settings** → paste the URL → **Create trip**.
5. Tap **Copy invite link** and send it to your travel companion. They open it once on their phone.

Your data lives in the `trips` tab of your Sheet. Nothing is deleted unless you delete the row.

## 3. Live trains & YouBike (optional, free)
1. Register at https://tdx.transportdata.tw (approval can take a few days).
2. Member center → API key → copy the Client ID and Secret.
3. Apps Script → ⚙️ Project Settings → Script properties: `TDX_ID`, `TDX_SECRET`.

## 4. Install on iPhone
Open the link in Safari → Share → **Add to Home Screen**. It opens full screen, works offline for saved data, and keeps your data.

Privacy: the repo is public, so booking numbers, PINs and income notes are typed into the app (Docs → My bookings) and stored only on your phone and in your Sheet.
