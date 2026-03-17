"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function () { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function (o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function (o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function (o) {
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
exports.TermprofileWatcher = void 0;
const vscode = __importStar(require("vscode"));
class TermprofileWatcher {
    constructor(profileManager) {
        this.profileManager = profileManager;
    }
    async importFromFile(uri, strategy) {
        const { profiles: incoming, error } = await this.validateFile(uri);
        if (error) {
            vscode.window.showErrorMessage(`Failed to import .termprofile: ${error}`);
            return 0;
        }
        if (strategy === 'replace') {
            for (const p of this.profileManager.getAllProfiles()) {
                await this.profileManager.deleteProfile(p.id);
            }
        }
        let count = 0;
        for (const incoming_p of incoming) {
            const freshId = Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
            const profile = { ...incoming_p, id: freshId };
            if (strategy === 'merge') {
                const existing = this.profileManager.getAllProfiles();
                const clash = existing.find(p => p.name === profile.name);
                if (clash) {
                    profile.name = `${profile.name} (from .termprofile)`;
                }
            }
            await this.profileManager.saveProfile(profile);
            count++;
        }
        return count;
    }
    async validateFile(uri) {
        let raw;
        try {
            const bytes = await vscode.workspace.fs.readFile(uri);
            raw = Buffer.from(bytes).toString('utf8');
        }
        catch (e) {
            return { profiles: [], error: `Cannot read file: ${e}` };
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch (e) {
            return { profiles: [], error: `Invalid JSON: ${e}` };
        }
        const file = parsed;
        if (file.version !== 1) {
            const proceed = await vscode.window.showWarningMessage('.termprofile version is missing or unrecognized. Try importing anyway?', 'Import Anyway', 'Cancel');
            if (proceed !== 'Import Anyway') {
                return { profiles: [], error: 'Import cancelled.' };
            }
        }
        if (!Array.isArray(file.profiles)) {
            return { profiles: [], error: 'File must have a "profiles" array.' };
        }
        const valid = file.profiles.filter((p) => typeof p?.name === 'string' && Array.isArray(p?.groups));
        return { profiles: valid };
    }
}
exports.TermprofileWatcher = TermprofileWatcher;
//# sourceMappingURL=termprofileWatcher.js.map