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

| Command | Description |
|---------|-------------|
| `Terminal Launcher: Open Settings` | Open the settings UI to create and manage profiles |
| `Terminal Launcher: Quick Launch` | Pick a saved profile from a dropdown and launch it |
| `Terminal Launcher: Launch Profile` | Launch a profile by ID |

### Creating a Profile

1. Run **Terminal Launcher: Open Settings**
2. Click **+ New Profile**
3. Enter a profile name
4. Configure terminal groups:
   - Toggle **Split terminal** to create two side-by-side terminals
   - Set a name, icon, and color for each terminal
   - Enter commands (one per line) that will auto-run when the terminal opens
5. Add more groups with **+ Add Terminal Group** if needed
6. Click **Save Profile**

### Launching a Profile

Run **Terminal Launcher: Quick Launch**, select a profile, and all configured terminals will open with their commands running automatically.

## Building from Source

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [VS Code](https://code.visualstudio.com/) (v1.85+)

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/terminal-launcher.git
cd terminal-launcher
npm install
npm run compile
```

### Development

1. Open the project folder in VS Code
2. Press `F5` to launch the Extension Development Host
3. Test the extension in the new VS Code window that opens

Use `npm run watch` for automatic recompilation on file changes.

### Project Structure

```
src/
├── extension.ts          # Entry point, command registration
├── terminalManager.ts    # Terminal creation, splitting, command execution
├── profileManager.ts     # Profile CRUD (stored in VS Code globalState)
├── settingsWebview.ts    # Webview panel for the settings UI
├── types.ts              # TypeScript interfaces
└── webview/
    ├── settings.css      # Theme-aware styles
    └── settings.js       # Settings UI logic
```

## License

MIT
