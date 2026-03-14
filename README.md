# Terminal Launcher - VS Code Extension

A VS Code extension that launches multiple pre-configured terminals with auto-run commands, split layouts, custom icons, and saveable profiles.

## Features

- **Multiple Terminals** - Open several terminal tabs at once with a single command
- **Auto-Run Commands** - Each terminal can run one or more commands automatically on launch
- **Split Terminals** - Split terminals side-by-side, each with its own commands
- **Custom Icons & Colors** - Assign icons and colors to terminals for easy identification
- **Saveable Profiles** - Save terminal configurations as profiles and launch them instantly

## Usage

Open the Command Palette (`Ctrl+Shift+P`) and use:

| Command                             | Description                                        |
| ----------------------------------- | -------------------------------------------------- |
| `Terminal Launcher: Open Settings`  | Open the settings UI to create and manage profiles |
| `Terminal Launcher: Quick Launch`   | Pick a saved profile from a dropdown and launch it |
| `Terminal Launcher: Launch Profile` | Launch a profile by ID                             |

### Creating a Profile

1. Run **Terminal Launcher: Open Settings**
2. Click **+ New Profile**
3. Enter a profile name
4. Configure terminal groups:
   - Choose a **Terminal Layout** (1-4 split panels side-by-side)
   - Set a name, icon, and color for each terminal panel
   - Enter commands (one per line) that will auto-run when the terminal opens
5. Add more groups with **+ Add Terminal Group** if needed
6. Click **Save Profile**

### Launching a Profile

Run **Terminal Launcher: Quick Launch**, select a profile, and all configured terminals will open with their commands running automatically.

## Create Profile
![Terminal Bulder](Profile-Config.png)

## Contol Terminal Profiles
![Terminal Launcher](Terminal-Launcher.png)

## Result Example
![Terminal Run](Terminal-Run.png)
