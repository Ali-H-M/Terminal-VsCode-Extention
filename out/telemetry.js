"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = init;
exports.sendEvent = sendEvent;
exports.dispose = dispose;
const vscode = __importStar(require("vscode"));
const secrets_1 = require("./secrets");
// Stable anonymous ID persisted per install in globalState
let _distinctId;
function init(context) {
    const stored = context.globalState.get('terminalLauncher.telemetryId');
    if (stored) {
        _distinctId = stored;
    }
    else {
        _distinctId = `tl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
        context.globalState.update('terminalLauncher.telemetryId', _distinctId);
    }
}
function sendEvent(event, properties) {
    if (!secrets_1.TELEMETRY_ENABLED) {
        return;
    }
    if (!vscode.env.isTelemetryEnabled) {
        return;
    }
    if (!_distinctId) {
        return;
    }
    const body = JSON.stringify({
        api_key: secrets_1.POSTHOG_API_KEY,
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
    fetch(`${secrets_1.POSTHOG_HOST}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
    }).catch(() => { });
}
function dispose() {
    _distinctId = undefined;
}
//# sourceMappingURL=telemetry.js.map