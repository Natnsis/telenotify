// Source of /verify.js, kept as plain ES2017 so it runs on any site without a build.
export const WIDGET_SOURCE = String.raw`/*! Telenotify "Verify with Telegram" button, https://github.com/sami-yesha/telenotify */
(function () {
  if (window.Telenotify && window.Telenotify.verify) return;
  var PORTAL = __PORTAL_ORIGIN__;

  // Opens the hosted verify page in a popup and resolves with the signed result.
  function verify(options) {
    options = options || {};
    return new Promise(function (resolve, reject) {
      if (!options.key) return reject(new Error('Telenotify: a publishable key (tn_pk_...) is required'));
      var params = new URLSearchParams({ key: options.key, origin: window.location.origin });
      if (options.phone) params.set('phone', options.phone);
      var url = PORTAL + '/verify/start?' + params.toString();
      var w = 460, h = 720;
      var left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
      var top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
      var popup = window.open(url, 'telenotify-verify', 'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top);
      if (!popup) {
        if (options.returnUrl) {
          var redirect = new URLSearchParams({ key: options.key, return_url: options.returnUrl });
          if (options.phone) redirect.set('phone', options.phone);
          window.location.assign(PORTAL + '/verify/start?' + redirect.toString());
          return;
        }
        return reject(new Error('Telenotify: the popup was blocked. Call verify() from a click, or pass returnUrl.'));
      }
      var settled = false;
      function onMessage(event) {
        // Only trust results from the Telenotify portal.
        if (event.origin !== PORTAL || !event.data || event.data.type !== 'telenotify:verification') return;
        settled = true;
        cleanup();
        resolve({ id: event.data.id, status: event.data.status, phone: event.data.phone, reason: event.data.reason, token: event.data.token });
      }
      var timer = setInterval(function () {
        if (popup.closed && !settled) {
          cleanup();
          resolve({ status: 'CANCELLED', id: null, phone: null, reason: 'closed', token: null });
        }
      }, 500);
      function cleanup() {
        clearInterval(timer);
        window.removeEventListener('message', onMessage);
      }
      window.addEventListener('message', onMessage);
    });
  }

  var STYLE =
    ':host{display:inline-block;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    'button{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:10px;min-width:240px;padding:12px 20px;border-radius:14px;font-size:15px;font-weight:600;line-height:1;cursor:pointer;color:#fff;background:#2aabee;box-shadow:0 6px 18px -6px rgba(42,171,238,.6);transition:transform .15s,box-shadow .15s,background .2s}' +
    'button:hover{transform:translateY(-1px);box-shadow:0 10px 24px -8px rgba(42,171,238,.7)}' +
    'button:focus-visible{outline:3px solid rgba(42,171,238,.45);outline-offset:2px}' +
    'button[disabled]{cursor:default;transform:none}' +
    ':host([theme=dark]) button{background:#1d2733;color:#fff;box-shadow:none;border:1px solid #2b3a4a}' +
    'button.done{background:#10b981;box-shadow:0 6px 18px -6px rgba(16,185,129,.6)}' +
    '.spin{width:16px;height:16px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:s .8s linear infinite}@keyframes s{to{transform:rotate(360deg)}}' +
    'svg{width:20px;height:20px;flex:none}';
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z"/><path d="M8.8 12.2l2.2 2.2 4.3-4.6"/></svg>';
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  // <telenotify-verify key="tn_pk_..." phone="0911..." label="..." theme="dark">
  // Fires "verified" (detail: { id, phone, token }), "failed" and "cancel" events.
  if (window.customElements && !customElements.get('telenotify-verify')) {
    customElements.define(
      'telenotify-verify',
      class extends HTMLElement {
        connectedCallback() {
          if (this.shadowRoot) return;
          var root = this.attachShadow({ mode: 'open' });
          root.innerHTML = '<style>' + STYLE + '</style><button type="button" part="button"></button>';
          this.button = root.querySelector('button');
          this.idle();
          var self = this;
          this.button.addEventListener('click', function () {
            self.button.disabled = true;
            self.button.innerHTML = '<span class="spin"></span>Waiting for Telegram\u2026';
            verify({ key: self.getAttribute('key'), phone: self.getAttribute('phone') || undefined, returnUrl: self.getAttribute('return-url') || undefined }).then(
              function (result) {
                if (result.status === 'VERIFIED') {
                  self.button.className = 'done';
                  self.button.innerHTML = CHECK + 'Phone verified';
                  self.dispatchEvent(new CustomEvent('verified', { detail: result, bubbles: true }));
                } else {
                  self.idle();
                  self.dispatchEvent(new CustomEvent(result.status === 'CANCELLED' ? 'cancel' : 'failed', { detail: result, bubbles: true }));
                }
              },
              function (error) {
                self.idle();
                self.dispatchEvent(new CustomEvent('failed', { detail: { status: 'ERROR', reason: error.message }, bubbles: true }));
              },
            );
          });
        }
        idle() {
          this.button.disabled = false;
          this.button.className = '';
          this.button.innerHTML = ICON + (this.getAttribute('label') || 'Verify with Telegram');
        }
      },
    );
  }

  window.Telenotify = Object.assign(window.Telenotify || {}, { verify: verify });
})();
`;
