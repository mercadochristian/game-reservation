# PWA Setup Guide — Dreamers Volleyball Club

Make the webapp installable on iOS and Android phones, with optional push notification support.

---

## Part 1 — Make the App Installable

### Step 1 — Install `next-pwa`

```bash
npm install next-pwa
npm install --save-dev @types/next-pwa
```

### Step 2 — Update `next.config.ts`

Replace the contents of `next.config.ts`:

```ts
import withPWA from 'next-pwa'
import type { NextConfig } from 'next'

const baseConfig: NextConfig = {
  // your existing config here
}

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})(baseConfig)
```

> `disable: process.env.NODE_ENV === 'development'` prevents the service worker from interfering during local development.

### Step 3 — Create `public/manifest.json`

Create this file at `public/manifest.json`:

```json
{
  "name": "Dreamers Volleyball Club",
  "short_name": "Dreamers VC",
  "description": "Dream hard, play harder.",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### Step 4 — Generate App Icons

You need two icon sizes: **192×192** and **512×512**.

**Option A — Online (easiest)**
1. Go to [realfavicongenerator.net](https://realfavicongenerator.net)
2. Upload `public/logo.png`
3. Download the generated package
4. Copy `android-chrome-192x192.png` → `public/icon-192.png`
5. Copy `android-chrome-512x512.png` → `public/icon-512.png`

**Option B — CLI with `sharp`**
```bash
npm install --save-dev sharp
node -e "
const sharp = require('sharp');
sharp('public/logo.png').resize(192,192).toFile('public/icon-192.png', ()=>{});
sharp('public/logo.png').resize(512,512).toFile('public/icon-512.png', ()=>{});
"
```

### Step 5 — Update `src/app/layout.tsx` Metadata

Add PWA metadata fields to the existing `metadata` export:

```ts
import type { Metadata } from 'next'
import { getBrandingMeta } from '@/lib/config/branding'

const brandingMeta = getBrandingMeta()

export const metadata: Metadata = {
  title: brandingMeta.title,
  description: brandingMeta.description,
  manifest: '/manifest.json',
  themeColor: '#3b82f6',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Dreamers VC',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: [{ url: '/icon-192.png', sizes: '192x192' }],
  },
}
```

Also add the viewport meta to the `<html>` or `<head>` if not already present. Next.js handles this automatically via the `viewport` export:

```ts
import type { Viewport } from 'next'

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}
```

### Step 6 — Build and Test

```bash
npm run build
npm run start
```

**On iPhone (Safari):**
1. Open the app URL in Safari
2. Tap the Share button (box with arrow)
3. Tap **"Add to Home Screen"**
4. Tap **Add** — the app icon appears on your home screen

**On Android (Chrome):**
1. Open the app URL in Chrome
2. Tap the 3-dot menu → **"Add to Home Screen"** or wait for the install banner
3. Tap **Install**

The app now opens in standalone mode (no browser address bar, fullscreen-like experience).

---

## Part 2 — Push Notifications (Optional)

PWA supports native push notifications — players can receive alerts when installed on their phone.

**Platform support:**
- Android Chrome: ✅ Full support
- iOS Safari 16.4+ (PWA must be installed first): ✅ Supported since 2023
- iOS Safari (not installed as PWA): ❌ Not supported

### How It Works

1. User opens the app and grants notification permission
2. Browser creates a unique **push subscription** (endpoint + keys)
3. App saves that subscription to Supabase
4. Your server sends a push message to that endpoint using VAPID keys
5. The service worker wakes up and shows a notification, even if the browser is closed

### Step 7 — Generate VAPID Keys

VAPID keys authenticate your server as the sender.

```bash
npx web-push generate-vapid-keys
```

Output:
```
Public Key: Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Private Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Add to `.env.local`:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_EMAIL=mailto:admin@dreamersvc.com
```

> Never commit the private key. Only `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is safe to expose to the browser.

### Step 8 — Install `web-push`

```bash
npm install web-push
npm install --save-dev @types/web-push
```

### Step 9 — Subscribe the User (Client Side)

Create a hook or utility to request permission and subscribe:

```ts
// src/lib/push/subscribe.ts

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported')
    return null
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const registration = await navigator.serviceWorker.ready

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    ),
  })

  return subscription
}

// Helper to convert VAPID public key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}
```

### Step 10 — Save Subscription to Supabase

After subscribing, save it to a `push_subscriptions` table:

```sql
-- Migration: create push_subscriptions table
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz default now()
);
```

```ts
// After calling subscribeToPush()
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()

await supabase.from('push_subscriptions').upsert({
  user_id: user!.id,
  endpoint: subscription.endpoint,
  keys: {
    p256dh: subscription.toJSON().keys!.p256dh,
    auth: subscription.toJSON().keys!.auth,
  },
}, { onConflict: 'endpoint' })
```

### Step 11 — Send a Push Notification (API Route)

Create `src/app/api/push/send/route.ts`:

```ts
import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: NextRequest) {
  const { userId, title, body } = await req.json()

  const supabase = createServiceClient()
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, keys')
    .eq('user_id', userId)

  if (!subscriptions?.length) {
    return NextResponse.json({ sent: 0 })
  }

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys as { p256dh: string; auth: string },
        },
        JSON.stringify({ title, body, icon: '/icon-192.png' })
      )
    )
  )

  return NextResponse.json({ sent: results.filter((r) => r.status === 'fulfilled').length })
}
```

### Step 12 — Handle Push in the Service Worker

`next-pwa` auto-generates the service worker. To add push handling, create a custom service worker file at `public/sw-custom.js` and reference it in `next.config.ts`:

```js
// public/sw-custom.js
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title || 'Dreamers VC'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow('/'))
})
```

Update `next.config.ts` to merge the custom service worker:

```ts
export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  swSrc: 'public/sw-custom.js', // your custom SW code is injected
})(baseConfig)
```

---

## Notification Use Cases

| Trigger | Notification |
|---------|-------------|
| Registration confirmed | "You're registered for Saturday's game!" |
| Payment approved | "Your payment has been verified ✅" |
| Payment rejected | "Your payment needs attention" |
| Game reminder | "Reminder: Game starts tomorrow at 6pm" |
| Schedule cancelled | "Saturday's game has been cancelled" |
| Lineup published | "Your team lineup is ready — check it out!" |

To send a notification, call the API route from anywhere on the server:

```ts
await fetch('/api/push/send', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'uuid-of-player',
    title: 'Registration Confirmed',
    body: "You're in for Saturday's game!",
  }),
})
```

---

## Verification Checklist

- [ ] `npm run build && npm run start` runs without errors
- [ ] Lighthouse PWA audit passes (DevTools → Lighthouse → PWA)
- [ ] App appears installable on Chrome (install banner or menu option)
- [ ] App appears installable on iOS Safari (Share → Add to Home Screen)
- [ ] Installed app opens without browser chrome (standalone mode)
- [ ] App icon is visible on home screen
- [ ] Push permission prompt appears after install
- [ ] Test push notification received on device lock screen
- [ ] Tapping notification opens the app

---

## Troubleshooting

**Service worker not registering**
- Must be on HTTPS in production (localhost is exempt)
- Check browser DevTools → Application → Service Workers

**"Add to Home Screen" not showing on Android**
- Manifest must be valid (check DevTools → Application → Manifest)
- App must be served over HTTPS
- User must have visited the site twice with 5 minutes between visits (Chrome heuristic)

**Push not working on iOS**
- Requires iOS 16.4+
- App must be installed as PWA first (not in Safari browser)
- User must grant notification permission explicitly

**VAPID error on push send**
- Double-check `.env.local` values match the generated keys exactly
- Ensure `VAPID_EMAIL` uses `mailto:` prefix
