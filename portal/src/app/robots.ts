import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Public pages are open to search engines; the dashboard and API proxy are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/o/', '/admin', '/dashboard', '/account', '/onboarding', '/invite', '/api/', '/check-email', '/verify-email', '/reset-password'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
