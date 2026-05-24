/**
 * portal-bridge.js
 * IXO Portal postMessage bridge — protocol: ixo.portal.iframe.v1, version: 1.0
 *
 * Security contract (per SKILL.md):
 *  - Install listener BEFORE sending READY.
 *  - Initial READY may use '*' because host origin is not yet known.
 *  - After INIT, store host.origin and use only that as targetOrigin.
 *  - Validate protocol, version, type, and payload shape on every incoming message.
 *  - Never store private keys or long-lived secrets.
 *  - All signing/auth/tx go through Portal-mediated EVENT messages.
 */

(function () {
  'use strict';

  const PROTOCOL = 'ixo.portal.iframe.v1';
  const VERSION  = '1.0';

  let _hostOrigin    = null;   // set on INIT, used as targetOrigin thereafter
  let _entityDid     = null;
  let _domainDid     = null;
  let _walletAddress = null;
  let _initialized   = false;

  // ── Outbound helpers ──────────────────────────────────────────────────────

  function _send(type, payload) {
    const msg = { protocol: PROTOCOL, version: VERSION, type, payload: payload || {} };
    const target = _hostOrigin || '*';   // '*' only before INIT
    window.parent.postMessage(msg, target);
  }

  // ── Inbound validation ────────────────────────────────────────────────────

  function _isValidPortalMessage(event) {
    if (!event.data || typeof event.data !== 'object') return false;
    if (event.data.protocol !== PROTOCOL)              return false;
    if (event.data.version  !== VERSION)               return false;
    if (typeof event.data.type !== 'string')           return false;
    // After INIT: reject messages from any other origin.
    if (_hostOrigin && event.origin !== _hostOrigin)   return false;
    return true;
  }

  // ── Message handler ───────────────────────────────────────────────────────

  function _onMessage(event) {
    if (!_isValidPortalMessage(event)) return;

    const { type, payload } = event.data;

    switch (type) {
      case 'INIT': {
        // Validate minimum expected INIT payload fields.
        if (!payload || !payload.host || !payload.host.origin) {
          console.warn('[PortalBridge] INIT payload missing host.origin — ignoring.');
          return;
        }
        _hostOrigin    = payload.host.origin;
        _entityDid     = payload.entityDid     || null;
        _domainDid     = payload.domainDid     || null;
        _walletAddress = payload.walletAddress || null;
        _initialized   = true;

        // Notify app layer.
        window.dispatchEvent(new CustomEvent('portal:init', {
          detail: { entityDid: _entityDid, domainDid: _domainDid, walletAddress: _walletAddress }
        }));

        // Acknowledge.
        _send('READY_ACK', {});
        break;
      }

      case 'EVENT': {
        if (!_initialized) return;
        // Re-emit as a DOM event so app-specific code can respond.
        window.dispatchEvent(new CustomEvent('portal:event', { detail: payload }));
        break;
      }

      case 'CONTEXT_UPDATE': {
        if (!_initialized) return;
        if (payload.entityDid)     _entityDid     = payload.entityDid;
        if (payload.domainDid)     _domainDid     = payload.domainDid;
        if (payload.walletAddress) _walletAddress = payload.walletAddress;
        window.dispatchEvent(new CustomEvent('portal:contextUpdate', { detail: payload }));
        break;
      }

      default:
        // Unknown message types are silently ignored (forward-compatible).
        break;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  window.IxoPortalBridge = {
    /**
     * Request a privileged action from Portal.
     * @param {string} action  - One of the features declared in manifest.json.
     * @param {object} params  - Action-specific parameters.
     */
    requestAction(action, params) {
      if (!_initialized) {
        console.warn('[PortalBridge] requestAction called before INIT.');
        return;
      }
      _send('EVENT', { action, params: params || {} });
    },

    /**
     * Expose current context for app reads (no writes).
     */
    get context() {
      return {
        entityDid:     _entityDid,
        domainDid:     _domainDid,
        walletAddress: _walletAddress,
        initialized:   _initialized,
      };
    },
  };

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  // Install listener FIRST, then send READY (initial '*' is allowed pre-INIT).

  window.addEventListener('message', _onMessage);
  _send('READY', { appId: 'yoma-impacts-dashboard', protocol: PROTOCOL, version: VERSION });

})();
