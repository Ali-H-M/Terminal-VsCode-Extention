import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

/** Minimal shape of the built-in VS Code Git extension API we rely on. */
interface GitExtensionExports {
  getAPI(version: 1): {
    repositories: Array<{
      rootUri: vscode.Uri;
      state: { HEAD?: { name?: string } };
    }>;
  };
}

/**
 * Best-effort current branch name for the first workspace folder.
 * Tries the built-in Git extension API first (handles detached HEAD, worktrees, etc.
 * correctly), and falls back to reading .git/HEAD directly if the Git extension
 * isn't available or hasn't finished activating.
 */
export async function getCurrentBranch(): Promise<string | undefined> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) { return undefined; }

  try {
    const gitExt = vscode.extensions.getExtension<GitExtensionExports>('vscode.git');
    if (gitExt) {
      const api = (gitExt.isActive ? gitExt.exports : await gitExt.activate()).getAPI(1);
      const repo = api.repositories.find(r => r.rootUri.fsPath === folder.uri.fsPath) ?? api.repositories[0];
      const name = repo?.state.HEAD?.name;
      if (name) { return name; }
    }
  } catch {
    // fall through to manual read
  }

  try {
    const headPath = path.join(folder.uri.fsPath, '.git', 'HEAD');
    const content = await fs.readFile(headPath, 'utf8');
    const match = content.match(/^ref:\s*refs\/heads\/(.+)$/m);
    return match ? match[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

/** Matches a branch name against a simple glob pattern using only "*" as a wildcard. */
export function matchesBranchPattern(branch: string, pattern: string): boolean {
  const trimmed = pattern.trim();
  if (!trimmed) { return false; }
  const escaped = trimmed.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(branch);
}
