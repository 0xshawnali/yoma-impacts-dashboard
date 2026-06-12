# Yoma Impacts Dashboard

Multi-funder reporting dashboard for the **Yoma Impacts Exchange** — hosted as a static iframe app inside the IXO Portal DPP domain.

- Protocol: `ixo.portal.iframe.v1` version `1.0`
- Route inside Portal: `/domain/[entityDid]/app/yoma-impacts-dashboard`
- Deployed to: Cloudflare Pages → `https://yoma-impacts-dashboard.pages.dev`

---

## Files

```
public/
  index.html        App entry point (CSP, frame-ancestors, no inline scripts)
  portal-bridge.js  Secure postMessage bridge (ixo.portal.iframe.v1 contract)
  app.js            Dashboard UI and data logic
  styles.css        Yoma brand light theme — iframe-safe
  manifest.json     Portal app discovery manifest
  _headers          Cloudflare Pages HTTP headers (CSP, frame-ancestors, CORS)
  _redirects        SPA fallback route

wrangler.toml       Cloudflare Pages project config
package.json        Dev and deploy scripts
.github/workflows/
  deploy.yml        Auto-deploy to Cloudflare Pages on push to main
```

---

## Local development

```bash
npm install
npm run dev
# Open http://localhost:3000
# The app will detect it is not inside a Portal iframe and
# render in standalone mode with mock data after 1.2s.
```

---

## Deploy to Cloudflare Pages (manual)

```bash
# One-time setup: log in to Cloudflare
npx wrangler login

# Create the Pages project (first deploy only)
npx wrangler pages project create yoma-impacts-dashboard

# Deploy
npm run deploy
```

The app will be live at `https://yoma-impacts-dashboard.pages.dev`.

---

## Auto-deploy via GitHub Actions

1. Add two secrets to your GitHub repo:
   - `CLOUDFLARE_API_TOKEN` — a Cloudflare API token with *Cloudflare Pages: Edit* permission
   - `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID (found in the Cloudflare dashboard URL)

2. Push to `main`. The workflow in `.github/workflows/deploy.yml` will deploy automatically.

Pull requests get a preview deployment URL from Cloudflare.

---

## Register the app in a Portal domain (linked resource)

After deploying, register the manifest as a linked resource on the target IXO entity so Portal can discover the app.

### Linked resource shape

```json
{
  "type": "PortalApp",
  "id": "yoma-impacts-dashboard",
  "mediaType": "application/json",
  "serviceEndpoint": "https://yoma-impacts-dashboard.pages.dev/manifest.json",
  "description": "Yoma Impacts Exchange — multi-funder reporting dashboard"
}
```

### Register via IXO CLI or SDK

```ts
import { createQueryClient, createSigningClient } from '@ixo/impactxclient-sdk';

// Add the linked resource to the target entity DID.
// Replace CONTRACT_ENTITY_DID and wallet config with your values.
const tx = {
  typeUrl: '/ixo.entity.v1beta1.MsgUpdateEntity',
  value: {
    id: CONTRACT_ENTITY_DID,
    linkedResources: [
      {
        type: 'PortalApp',
        id: 'yoma-impacts-dashboard',
        mediaType: 'application/json',
        serviceEndpoint: 'https://yoma-impacts-dashboard.pages.dev/manifest.json',
        description: 'Yoma Impacts Exchange — multi-funder reporting dashboard',
      }
    ]
  }
};
```

### Update manifest origins before registering

Edit `public/manifest.json` and replace the `allowedOrigins` with the exact origins of your Portal instance:

```json
"iframe": {
  "allowedOrigins": [
    "https://portal.ixo.world",
    "https://dpp.ixo.world"
  ]
}
```

Redeploy after updating the manifest.

---

## Portal message contract

The bridge (`portal-bridge.js`) implements `ixo.portal.iframe.v1`:

| Direction | Type           | When |
|-----------|----------------|------|
| App → Host | `READY`       | On load, after listener installed, before INIT |
| Host → App | `INIT`        | Portal sends entity/domain/wallet context |
| App → Host | `READY_ACK`   | After valid INIT received |
| Host → App | `EVENT`       | Portal pushes context updates or responses |
| App → Host | `EVENT`       | App requests privileged actions |
| Host → App | `CONTEXT_UPDATE` | Domain context changed |

All messages include `protocol: "ixo.portal.iframe.v1"` and `version: "1.0"`.

---

## Security notes

- `portal-bridge.js` validates `origin`, `protocol`, `version`, and `type` on every message.
- After `INIT`, only messages from the exact `host.origin` are accepted.
- No private keys or long-lived secrets are stored in the iframe.
- Signing, transactions, and auth refreshes go through `IxoPortalBridge.requestAction()` only.
- `frame-ancestors` in `_headers` and in the `Content-Security-Policy` meta tag restricts embedding to Portal origins.

---

## Replacing placeholders

| Placeholder | Where | Replace with |
|---|---|---|
| `https://yoma-impacts-dashboard.pages.dev` | `manifest.json`, `_headers` | Your actual Pages URL |
| `https://portal.ixo.world` | `manifest.json`, `_headers`, `index.html` CSP | Your Portal origin |
| `https://dpp.ixo.world` | Same | Your DPP domain origin |
| `UNICEF-IXO-2024-001` | `app.js` | Actual contract entity DID from Portal INIT context |
| Cloudflare account/project | `wrangler.toml`, GitHub secrets | Your Cloudflare account ID and project name |
