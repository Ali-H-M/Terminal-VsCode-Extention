import * as vscode from 'vscode';
import { POSTHOG_API_KEY, POSTHOG_HOST, TELEMETRY_ENABLED } from './secrets';

// Stable anonymous ID persisted per install in globalState
let _distinctId: string | undefined;

export function init(context: vscode.ExtensionContext): void {
  const stored = context.globalState.get<string>('terminalLauncher.telemetryId');
  if (stored) {
    _distinctId = stored;
  } else {
    _distinctId = `tl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    context.globalState.update('terminalLauncher.telemetryId', _distinctId);
  }
}

export function sendEvent(event: string, properties?: Record<string, string | number | boolean>): void {
  if (!TELEMETRY_ENABLED) { return; }
  if (!vscode.env.isTelemetryEnabled) { return; }
  if (!_distinctId) { return; }

  const body = JSON.stringify({
    api_key: POSTHOG_API_KEY, 
    event,
    distinct_id: _distinctId,
    properties: {
      ...properties,
      vscode_version: vscode.version,
      extension_version: vscode.extensions.getExtension('Ali-H-M.terminal-profile-launcher')?.packageJSON?.version ?? 'unknown',
      $lib: 'terminal-profile-launcher',
      // Drop personal geo/IP fields
      $ip: '0',
      $geoip_city_name: null,
      $geoip_latitude: null,
      $geoip_longitude: null,
      $geoip_accuracy_radius: null,
      $geoip_postal_code: null,
    },
  });

  // Fire-and-forget — never await, never throw
  fetch(`${POSTHOG_HOST}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).catch(() => { /* silently ignore network errors */ });
}

export function dispose(): void {
  _distinctId = undefined;
}
