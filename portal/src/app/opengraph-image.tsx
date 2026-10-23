import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'Telenotify: customer notifications on Telegram, with one API call';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// The card shown when the site is shared on Telegram, WhatsApp, X or LinkedIn.
export default async function OpenGraphImage() {
  const svg = await readFile(join(process.cwd(), 'src/app/icon.svg'), 'utf8');
  const logo = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: 'linear-gradient(135deg, #070b14 0%, #0d1530 55%, #1e1b4b 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={84} height={84} alt="" />
          <span style={{ fontSize: 44, fontWeight: 700 }}>Telenotify</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <span style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, maxWidth: 980 }}>Notifications your customers actually open.</span>
          <span style={{ fontSize: 30, color: '#a5b4fc', maxWidth: 960 }}>
            Order updates, OTPs and receipts on Telegram with one API call. Up to 30× cheaper than SMS.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 22, color: '#cbd5e1' }}>
          {['Free sandbox', 'Your branded bot', 'No-SMS phone checks', 'Amharic templates'].map((item) => (
            <span key={item} style={{ display: 'flex', alignItems: 'center', flexShrink: 0, whiteSpace: 'nowrap', padding: '10px 20px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)' }}>
              {item}
            </span>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
