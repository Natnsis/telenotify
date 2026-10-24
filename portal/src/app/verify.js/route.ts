import { NextRequest } from 'next/server';
import { WIDGET_SOURCE } from './widget';

// GET /verify.js: the embeddable "Verify with Telegram" button. The portal's own
// address is baked in so the popup and the postMessage origin check line up.
export function GET(request: NextRequest) {
  const proto = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.host;
  const portal = `${proto}://${host}`;
  return new Response(WIDGET_SOURCE.replace('__PORTAL_ORIGIN__', JSON.stringify(portal)), {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'public, max-age=300',
      'access-control-allow-origin': '*',
    },
  });
}
