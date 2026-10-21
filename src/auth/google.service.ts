import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
}

// OAuth 2.0 authorization-code flow against Google's OpenID endpoints.
@Injectable()
export class GoogleService {
  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return Boolean(this.config.get('GOOGLE_CLIENT_ID') && this.config.get('GOOGLE_CLIENT_SECRET'));
  }

  // Google redirects back through the portal's /api proxy, so the session cookie lands on the portal's origin.
  redirectUri(): string {
    return `${this.config.getOrThrow<string>('PORTAL_URL').replace(/\/$/, '')}/api/auth/google/callback`;
  }

  authorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.getOrThrow('GOOGLE_CLIENT_ID'),
      redirect_uri: this.redirectUri(),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async exchangeCode(code: string): Promise<GoogleProfile> {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.getOrThrow('GOOGLE_CLIENT_ID'),
        client_secret: this.config.getOrThrow('GOOGLE_CLIENT_SECRET'),
        redirect_uri: this.redirectUri(),
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenResponse.ok) throw new Error(`Google token exchange failed (${tokenResponse.status})`);
    const { access_token } = (await tokenResponse.json()) as { access_token: string };

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${access_token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!profileResponse.ok) throw new Error(`Google userinfo failed (${profileResponse.status})`);
    const profile = (await profileResponse.json()) as { sub: string; email?: string; email_verified?: boolean; name?: string };
    if (!profile.email || !profile.email_verified) throw new Error('Google account has no verified email');
    return { sub: profile.sub, email: profile.email, name: profile.name ?? '' };
  }
}
