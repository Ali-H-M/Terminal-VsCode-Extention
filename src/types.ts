/** A single terminal within a group */
export interface TerminalConfig {
  name: string;
  commands: string[];
  icon?: string;   // ThemeIcon id, e.g. "flame", "zap", "terminal"
  color?: string;  // ThemeColor id, e.g. "terminal.ansiRed"
  cwd?: string;    // Working directory, e.g. "./frontend" or "/absolute/path"
}

/** A group of terminals that may be split side-by-side */
export interface TerminalGroup {
  terminals: TerminalConfig[];
  splitCount: number; // 1 = single terminal, 2-4 = number of split panes
  disabled?: boolean; // if true, this group is skipped on launch
}

/** A named, saveable profile */
export interface Profile {
  id: string;
  name: string;
  groups: TerminalGroup[];
  closeOnRelaunch?: boolean; // close previously launched terminals from this profile before relaunching
  pinned?: boolean;          // pinned profiles appear at the top of the list and Quick Launch
  autoLaunch?: boolean;      // auto-launch this profile when the workspace opens
}

/** Format of a .termprofile file at repo root */
export interface TermprofileFile {
  version: 1;
  description?: string;
  profiles: Omit<Profile, 'id'>[];
}

/** Messages sent between extension and webview */
export type WebviewMessage =
  | { command: 'getProfiles' }
  | { command: 'saveProfile'; profile: Profile }
  | { command: 'deleteProfile'; profileId: string }
  | { command: 'launchProfile'; profileId: string }
  | { command: 'exportProfiles' }
  | { command: 'importProfiles' }
  | { command: 'reorderProfiles'; ids: string[] }
  | { command: 'checkHealth'; profileId: string }
  | { command: 'checkCwdPath'; path: string; gi: number; ti: number }
  | { command: 'profilesLoaded'; profiles: Profile[] }
  | { command: 'profileSaved'; profile: Profile }
  | { command: 'healthResult'; profileId: string; issues: Array<{ group: number; terminal: string; path: string }> }
  | { command: 'cwdCheckResult'; gi: number; ti: number; exists: boolean; path: string }
  | { command: 'error'; message: string }
  // .termprofile repo file
  | { command: 'importFromTermprofile' }
  | { command: 'createTermprofile' };
