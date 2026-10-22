import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// iOS home-screen icon, rendered from the same artwork as the favicon.
export default async function AppleIcon() {
  const svg = await readFile(join(process.cwd(), 'src/app/icon.svg'), 'utf8');
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`} width={180} height={180} alt="" />,
    size,
  );
}
