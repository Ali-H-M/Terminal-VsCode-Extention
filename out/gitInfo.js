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
exports.getCurrentBranch = getCurrentBranch;
exports.matchesBranchPattern = matchesBranchPattern;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
// Best-effort current branch name for the first workspace folder
async function getCurrentBranch() {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
        return undefined;
    }
    try {
        const gitExt = vscode.extensions.getExtension('vscode.git');
        if (gitExt) {
            const api = (gitExt.isActive ? gitExt.exports : await gitExt.activate()).getAPI(1);
            const repo = api.repositories.find(r => r.rootUri.fsPath === folder.uri.fsPath) ?? api.repositories[0];
            const name = repo?.state.HEAD?.name;
            if (name) {
                return name;
            }
        }
    }
    catch {
        // fall through to manual read
    }
    try {
        const headPath = path.join(folder.uri.fsPath, '.git', 'HEAD');
        const content = await fs.readFile(headPath, 'utf8');
        const match = content.match(/^ref:\s*refs\/heads\/(.+)$/m);
        return match ? match[1].trim() : undefined;
    }
    catch {
        return undefined;
    }
}
// Matches a branch name against a simple glob pattern using only "*" as a wildcard
function matchesBranchPattern(branch, pattern) {
    const trimmed = pattern.trim();
    if (!trimmed) {
        return false;
    }
    const escaped = trimmed.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`).test(branch);
}
//# sourceMappingURL=gitInfo.js.map