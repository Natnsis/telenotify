import { smtpOptions } from './mail.service';

describe('smtpOptions', () => {
  it('parses an SMTP URL with an encoded login and adds short timeouts', () => {
    expect(smtpOptions('smtp://abc%40smtp-brevo.com:s3cr%2Ft@smtp-relay.brevo.com:587')).toMatchObject({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: { user: 'abc@smtp-brevo.com', pass: 's3cr/t' },
      connectionTimeout: 10_000,
    });
  });

  it('uses TLS and port 465 for smtps', () => {
    expect(smtpOptions('smtps://u:p@mail.example.com')).toMatchObject({ port: 465, secure: true });
  });
});
