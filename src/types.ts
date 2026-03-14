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

/** Messages sent between extension and webview */
export type WebviewMessage =
  | { command: 'getProfiles' }
  | { command: 'saveProfile'; profile: Profile }
  | { command: 'deleteProfile'; profileId: string }
  | { command: 'launchProfile'; profileId: string }
  | { command: 'exportProfiles' }
  | { command: 'importProfiles' }
  | { command: 'reorderProfiles'; ids: string[] }
  | { command: 'profilesLoaded'; profiles: Profile[] }
  | { command: 'profileSaved'; profile: Profile }
  | { command: 'error'; message: string };
