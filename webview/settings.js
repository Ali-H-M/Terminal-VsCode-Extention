// @ts-nocheck
(function () {
  const vscode = acquireVsCodeApi();

  let profiles = [];
  let editingProfile = null; // null = list view, object = editing
  let pendingDeleteId = null; // track delete confirmation

  // All codicon icon IDs (same as VSCode's "Change Icon" picker)
  const ALL_ICONS = [
    'account', 'activate-breakpoints', 'add', 'add-small', 'agent', 'alert', 'archive', 'array',
    'arrow-both', 'arrow-circle-down', 'arrow-circle-left', 'arrow-circle-right', 'arrow-circle-up',
    'arrow-down', 'arrow-left', 'arrow-right', 'arrow-small-down', 'arrow-small-left',
    'arrow-small-right', 'arrow-small-up', 'arrow-swap', 'arrow-up', 'ask', 'attach',
    'azure', 'azure-devops', 'beaker', 'beaker-stop', 'bell', 'bell-dot', 'bell-slash',
    'bell-slash-dot', 'blank', 'bold', 'book', 'bookmark', 'bracket', 'bracket-dot',
    'bracket-error', 'briefcase', 'broadcast', 'browser', 'bug', 'build', 'calendar',
    'call-incoming', 'call-outgoing', 'case-sensitive', 'check', 'check-all',
    'checklist', 'chevron-down', 'chevron-left', 'chevron-right', 'chevron-up', 'chip',
    'chrome-close', 'chrome-maximize', 'chrome-minimize', 'chrome-restore',
    'circle', 'circle-filled', 'circle-large', 'circle-large-filled', 'circle-large-outline',
    'circle-outline', 'circle-slash', 'circle-small', 'circle-small-filled', 'circuit-board',
    'clear-all', 'clippy', 'clock', 'clockface', 'clone', 'close', 'close-all', 'close-dirty',
    'cloud', 'cloud-download', 'cloud-small', 'cloud-upload', 'code', 'code-oss', 'code-review',
    'coffee', 'collapse-all', 'collection', 'collection-small', 'color-mode', 'combine',
    'comment', 'comment-add', 'comment-discussion', 'comment-discussion-quote',
    'comment-draft', 'comment-unresolved', 'compare-changes', 'compass', 'compass-active',
    'compass-dot', 'console', 'copy', 'coverage', 'credit-card', 'cursor',
    'dash', 'dashboard', 'database', 'debug', 'debug-all', 'debug-alt', 'debug-alt-small',
    'debug-breakpoint', 'debug-breakpoint-conditional', 'debug-breakpoint-conditional-disabled',
    'debug-breakpoint-conditional-unverified', 'debug-breakpoint-data',
    'debug-breakpoint-data-disabled', 'debug-breakpoint-data-unverified',
    'debug-breakpoint-disabled', 'debug-breakpoint-function',
    'debug-breakpoint-function-disabled', 'debug-breakpoint-function-unverified',
    'debug-breakpoint-log', 'debug-breakpoint-log-disabled', 'debug-breakpoint-log-unverified',
    'debug-breakpoint-unsupported', 'debug-breakpoint-unverified', 'debug-connected',
    'debug-console', 'debug-continue', 'debug-continue-small', 'debug-coverage',
    'debug-disconnect', 'debug-hint', 'debug-line-by-line', 'debug-pause', 'debug-rerun',
    'debug-restart', 'debug-restart-frame', 'debug-reverse-continue', 'debug-stackframe',
    'debug-stackframe-active', 'debug-stackframe-dot', 'debug-stackframe-focused',
    'debug-start', 'debug-step-back', 'debug-step-into', 'debug-step-out', 'debug-step-over',
    'debug-stop', 'desktop-download', 'device-camera', 'device-camera-video', 'device-desktop',
    'device-mobile', 'diff', 'diff-added', 'diff-ignored', 'diff-modified', 'diff-multiple',
    'diff-removed', 'diff-renamed', 'diff-sidebyside', 'diff-single', 'discard', 'download',
    'edit', 'edit-code', 'edit-session', 'edit-sparkle', 'editor-layout', 'ellipsis',
    'empty-window', 'eraser', 'error', 'error-small', 'exclude', 'expand-all', 'export',
    'extensions', 'extensions-large', 'eye', 'eye-closed', 'eye-unwatch', 'eye-watch',
    'feedback', 'file', 'file-add', 'file-binary', 'file-code', 'file-directory',
    'file-directory-create', 'file-media', 'file-pdf', 'file-submodule',
    'file-symlink-directory', 'file-symlink-file', 'file-text', 'file-zip', 'files',
    'filter', 'filter-filled', 'flag', 'flame', 'fold', 'fold-down', 'fold-horizontal',
    'fold-horizontal-filled', 'fold-up', 'fold-vertical', 'fold-vertical-filled',
    'folder', 'folder-active', 'folder-library', 'folder-opened', 'forward', 'game', 'gather',
    'gear', 'gift', 'gist', 'gist-fork', 'gist-new', 'gist-private', 'gist-secret',
    'git-branch', 'git-branch-changes', 'git-branch-conflicts', 'git-branch-create',
    'git-branch-delete', 'git-branch-staged-changes', 'git-commit', 'git-compare',
    'git-fetch', 'git-fork-private', 'git-merge', 'git-pull-request',
    'git-pull-request-abandoned', 'git-pull-request-assignee', 'git-pull-request-closed',
    'git-pull-request-create', 'git-pull-request-done', 'git-pull-request-draft',
    'git-pull-request-go-to-changes', 'git-pull-request-label', 'git-pull-request-milestone',
    'git-pull-request-new-changes', 'git-pull-request-reviewer',
    'git-stash', 'git-stash-apply', 'git-stash-pop', 'github', 'github-action', 'github-alt',
    'github-inverted', 'github-project', 'globe', 'go-to-editing-session', 'go-to-file',
    'go-to-search', 'grabber', 'graph', 'graph-left', 'graph-line', 'graph-scatter', 'gripper',
    'group-by-ref-type', 'heart', 'heart-filled', 'history', 'home', 'horizontal-rule',
    'hubot', 'inbox', 'indent', 'index-zero', 'info', 'insert', 'inspect', 'issue-closed',
    'issue-draft', 'issue-opened', 'issue-reopened', 'issues', 'italic', 'jersey', 'json',
    'kebab-horizontal', 'kebab-vertical', 'key', 'keyboard', 'keyboard-tab',
    'keyboard-tab-above', 'keyboard-tab-below', 'law', 'layers', 'layers-active', 'layers-dot',
    'layout', 'layout-activitybar-left', 'layout-activitybar-right', 'layout-centered',
    'layout-menubar', 'layout-panel', 'layout-panel-center', 'layout-panel-dock',
    'layout-panel-justify', 'layout-panel-left', 'layout-panel-off', 'layout-panel-right',
    'layout-sidebar-left', 'layout-sidebar-left-dock', 'layout-sidebar-left-off',
    'layout-sidebar-right', 'layout-sidebar-right-dock', 'layout-sidebar-right-off',
    'layout-statusbar', 'library', 'light-bulb', 'lightbulb', 'lightbulb-autofix',
    'lightbulb-empty', 'lightbulb-sparkle', 'link', 'link-external', 'list-filter', 'list-flat',
    'list-ordered', 'list-selection', 'list-tree', 'list-unordered', 'live-share', 'loading',
    'location', 'lock', 'lock-small', 'log-in', 'log-out', 'logo-github', 'magnet', 'mail',
    'mail-read', 'mail-reply', 'map', 'map-filled', 'map-horizontal', 'map-horizontal-filled',
    'map-vertical', 'map-vertical-filled', 'mark-github', 'markdown', 'mcp', 'megaphone',
    'mention', 'menu', 'merge', 'merge-into', 'mic', 'mic-filled', 'microscope', 'milestone',
    'mirror', 'mirror-private', 'mirror-public', 'mortar-board', 'move', 'multiple-windows',
    'music', 'mute', 'new-collection', 'new-file', 'new-folder', 'new-session', 'newline',
    'no-newline', 'note', 'notebook', 'notebook-template', 'octoface', 'open-in-product',
    'open-in-window', 'open-preview', 'organization', 'organization-filled',
    'organization-outline', 'output', 'package', 'paintcan', 'pass', 'pass-filled', 'pencil',
    'percentage', 'person', 'person-add', 'person-filled', 'person-follow', 'person-outline',
    'piano', 'pie-chart', 'pin', 'pinned', 'pinned-dirty', 'play', 'play-circle', 'plug', 'plus',
    'preserve-case', 'preview', 'primitive-dot', 'primitive-square', 'project', 'pulse',
    'python', 'question', 'quote', 'quotes', 'radio-tower', 'reactions', 'record', 'record-keys',
    'record-small', 'redo', 'references', 'refresh', 'regex', 'remote', 'remote-explorer',
    'remove', 'remove-close', 'remove-small', 'rename', 'repl', 'replace', 'replace-all', 'reply',
    'repo', 'repo-clone', 'repo-create', 'repo-delete', 'repo-fetch', 'repo-force-push',
    'repo-forked', 'repo-pinned', 'repo-pull', 'repo-push', 'repo-selected', 'repo-sync',
    'report', 'request-changes', 'robot', 'rocket', 'root-folder', 'root-folder-opened', 'rss',
    'ruby', 'run', 'run-above', 'run-all', 'run-all-coverage', 'run-below', 'run-coverage',
    'run-errors', 'run-with-deps', 'save', 'save-all', 'save-as', 'screen-cut', 'screen-full',
    'screen-normal', 'search', 'search-fuzzy', 'search-large', 'search-save', 'search-sparkle',
    'search-stop', 'selection', 'send', 'send-to-remote-agent', 'server', 'server-environment',
    'server-process', 'session-in-progress', 'settings', 'settings-gear', 'share', 'shield',
    'sign-in', 'sign-out', 'skip', 'smiley', 'snake', 'sort-percentage', 'sort-precedence',
    'source-control', 'sparkle', 'sparkle-filled', 'split-horizontal', 'split-vertical',
    'squirrel', 'star', 'star-add', 'star-delete', 'star-empty', 'star-full', 'star-half',
    'stop', 'stop-circle', 'strikethrough', 'surround-with',
    'symbol-array', 'symbol-boolean', 'symbol-class', 'symbol-color', 'symbol-constant',
    'symbol-constructor', 'symbol-enum', 'symbol-enum-member', 'symbol-event', 'symbol-field',
    'symbol-file', 'symbol-folder', 'symbol-function', 'symbol-interface', 'symbol-key',
    'symbol-keyword', 'symbol-method', 'symbol-method-arrow', 'symbol-misc', 'symbol-module',
    'symbol-namespace', 'symbol-null', 'symbol-number', 'symbol-numeric', 'symbol-object',
    'symbol-operator', 'symbol-package', 'symbol-parameter', 'symbol-property',
    'symbol-reference', 'symbol-ruler', 'symbol-snippet', 'symbol-string', 'symbol-struct',
    'symbol-structure', 'symbol-text', 'symbol-type-parameter', 'symbol-unit', 'symbol-value',
    'symbol-variable', 'sync', 'sync-ignored', 'table', 'tag', 'tag-add', 'tag-remove', 'target',
    'tasklist', 'telescope', 'terminal', 'terminal-bash', 'terminal-cmd', 'terminal-debian',
    'terminal-decoration-error', 'terminal-decoration-incomplete', 'terminal-decoration-mark',
    'terminal-decoration-success', 'terminal-git-bash', 'terminal-linux',
    'terminal-powershell', 'terminal-tmux', 'terminal-ubuntu', 'text-size', 'thinking',
    'three-bars', 'thumbsdown', 'thumbsdown-filled', 'thumbsup', 'thumbsup-filled', 'tools',
    'trash', 'trashcan', 'triangle-down', 'triangle-left', 'triangle-right', 'triangle-up',
    'twitter', 'type-hierarchy', 'type-hierarchy-sub', 'type-hierarchy-super', 'unarchive',
    'unfold', 'ungroup-by-ref-type', 'unlock', 'unmute', 'unverified', 'variable',
    'variable-group', 'verified', 'verified-filled', 'versions', 'vm', 'vm-active', 'vm-connect',
    'vm-outline', 'vm-pending', 'vm-running', 'vm-small', 'vr', 'vscode', 'vscode-insiders',
    'wand', 'warning', 'watch', 'whitespace', 'whole-word', 'window', 'window-active', 'word-wrap',
    'workspace-trusted', 'workspace-unknown', 'workspace-untrusted', 'worktree',
    'worktree-small', 'wrench', 'wrench-subaction', 'x', 'zap', 'zoom-in', 'zoom-out'
  ];

  const COLOR_OPTIONS = [
    { value: '', label: 'Default', css: '' },
    { value: 'terminal.ansiRed', label: 'Red', css: '#cd3131' },
    { value: 'terminal.ansiGreen', label: 'Green', css: '#0dbc79' },
    { value: 'terminal.ansiYellow', label: 'Yellow', css: '#e5e510' },
    { value: 'terminal.ansiBlue', label: 'Blue', css: '#2472c8' },
    { value: 'terminal.ansiMagenta', label: 'Magenta', css: '#bc3fbc' },
    { value: 'terminal.ansiCyan', label: 'Cyan', css: '#11a8cd' },
    { value: 'terminal.ansiWhite', label: 'White', css: '#e5e5e5' },
  ];

  // --- Icon Picker Modal (VSCode-style) ---
  let activeIconPickerCallback = null;

  function openIconPicker(currentValue, onSelect) {
    // Prevent multiple modals
    closeIconPicker();
    activeIconPickerCallback = onSelect;

    const overlay = document.createElement('div');
    overlay.className = 'icon-modal-overlay';
    overlay.id = 'icon-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'icon-modal';

    // Search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'icon-modal-search';
    searchInput.placeholder = 'Search icons';
    searchInput.spellcheck = false;

    // Icon grid
    const grid = document.createElement('div');
    grid.className = 'icon-modal-grid';

    function renderIcons(filter) {
      const query = (filter || '').toLowerCase();
      grid.innerHTML = '';

      // "None/Default" option
      const noneBtn = document.createElement('button');
      noneBtn.type = 'button';
      noneBtn.className = 'icon-modal-item' + (!currentValue ? ' selected' : '');
      noneBtn.title = 'None (default)';
      noneBtn.innerHTML = '<i class="codicon codicon-close"></i>';
      noneBtn.dataset.value = '';
      grid.appendChild(noneBtn);

      const filtered = (query
        ? ALL_ICONS.filter(name => name.includes(query))
        : ALL_ICONS).slice().sort();

      filtered.forEach(name => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'icon-modal-item' + (currentValue === name ? ' selected' : '');
        btn.title = name;
        btn.innerHTML = `<i class="codicon codicon-${name}"></i>`;
        btn.dataset.value = name;
        grid.appendChild(btn);
      });
    }

    renderIcons('');

    // Search handler
    searchInput.addEventListener('input', () => {
      renderIcons(searchInput.value);
    });

    // Click on icon
    grid.addEventListener('click', (e) => {
      const item = e.target.closest('.icon-modal-item');
      if (!item) return;
      const value = item.dataset.value;
      if (activeIconPickerCallback) {
        activeIconPickerCallback(value);
      }
      closeIconPicker();
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeIconPicker();
    });

    // Close on Escape
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeIconPicker();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    modal.appendChild(searchInput);
    modal.appendChild(grid);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    searchInput.focus();
  }

  function closeIconPicker() {
    const overlay = document.getElementById('icon-modal-overlay');
    if (overlay) overlay.remove();
    activeIconPickerCallback = null;
  }

  // Request profiles on load
  window.addEventListener('DOMContentLoaded', () => {
    vscode.postMessage({ command: 'getProfiles' });
  });

  // Handle messages from extension
  window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.command) {
      case 'profilesLoaded':
        profiles = message.profiles;
        if (!editingProfile) {
          renderProfileList();
        }
        break;
      case 'profileSaved':
        editingProfile = null;
        vscode.postMessage({ command: 'getProfiles' });
        break;
      case 'error':
        alert(message.message);
        break;
      case 'exportDone':
        // handled by extension
        break;
    }
  });

  function renderProfileList() {
    const app = document.getElementById('app');
    if (profiles.length === 0) {
      app.innerHTML = `
        <h1>Terminal Launcher</h1>
        <div class="empty-state">
          <p>No profiles yet. Create one to get started!</p>
          <button id="btn-new-profile"><i class="codicon codicon-add"></i> New Profile</button>
          <button class="secondary icon-btn" id="btn-import" title="Import profiles from a JSON file">
            <i class="codicon codicon-cloud-download"></i> Import Profiles
          </button>
        </div>
      `;
    } else {
      let cardsHtml = profiles.map(p => {
        const terminalCount = p.groups.reduce((sum, g) => sum + g.terminals.length, 0);
        const groupCount = p.groups.length;
        const isDeleting = pendingDeleteId === p.id;
        return `
          <div class="profile-card ${isDeleting ? 'profile-card-deleting' : ''}">
            <div class="profile-card-info">
              <h3>${escapeHtml(p.name)}</h3>
              <p>${groupCount} group(s), ${terminalCount} terminal(s)</p>
            </div>
            ${isDeleting
            ? `<div class="profile-card-actions">
                   <span class="delete-confirm-text">Delete this profile?</span>
                   <button class="danger" id="btn-confirm-delete">Yes, Delete</button>
                   <button class="secondary" id="btn-cancel-delete">Cancel</button>
                 </div>`
            : `<div class="profile-card-actions">
                   <button data-action="launch" data-id="${p.id}">Launch</button>
                   <button class="secondary" data-action="edit" data-id="${p.id}">Edit</button>
                   <button class="secondary danger" data-action="delete" data-id="${p.id}">Delete</button>
                 </div>`
          }
          </div>
        `;
      }).join('');

      app.innerHTML = `
        <h1>Terminal Launcher</h1>
        <div id="profile-list">${cardsHtml}</div>
        <div class="list-footer">
          <button id="btn-new-profile"><i class="codicon codicon-add"></i> New Profile</button>
          <div class="list-footer-actions">
            <button class="secondary icon-btn" id="btn-import" title="Import profiles from a JSON file">
              <i class="codicon codicon-cloud-download"></i> Import
            </button>
            <button class="secondary icon-btn" id="btn-export" title="Export all profiles to a JSON file">
              <i class="codicon codicon-cloud-upload"></i> Export
            </button>
          </div>
        </div>
      `;
    }

    // Bind events
    document.getElementById('btn-new-profile')?.addEventListener('click', () => {
      editingProfile = createEmptyProfile();
      renderEditor();
    });

    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.getAttribute('data-action');
        const id = e.currentTarget.getAttribute('data-id');
        if (action === 'launch') {
          vscode.postMessage({ command: 'launchProfile', profileId: id });
        } else if (action === 'edit') {
          editingProfile = JSON.parse(JSON.stringify(profiles.find(p => p.id === id)));
          renderEditor();
        } else if (action === 'delete') {
          pendingDeleteId = id;
          renderProfileList();
        }
      });
    });

    // Confirm/cancel delete buttons
    document.getElementById('btn-confirm-delete')?.addEventListener('click', () => {
      if (pendingDeleteId) {
        vscode.postMessage({ command: 'deleteProfile', profileId: pendingDeleteId });
        pendingDeleteId = null;
      }
    });
    document.getElementById('btn-cancel-delete')?.addEventListener('click', () => {
      pendingDeleteId = null;
      renderProfileList();
    });

    document.getElementById('btn-export')?.addEventListener('click', () => {
      vscode.postMessage({ command: 'exportProfiles' });
    });
    document.getElementById('btn-import')?.addEventListener('click', () => {
      vscode.postMessage({ command: 'importProfiles' });
    });
  }

  function createEmptyProfile() {
    return {
      id: generateId(),
      name: '',
      groups: [
        {
          splitCount: 1,
          terminals: [{ name: '', commands: [''], icon: '', color: '' }],
        },
      ],
    };
  }

  function renderEditor() {
    const app = document.getElementById('app');
    const p = editingProfile;

    let groupsHtml = p.groups.map((group, gi) => {
      function renderTerminalCard(term, ti, label, showRemove) {
        return `
          <div class="terminal-card">
            <div class="terminal-card-header">
              <strong>${escapeHtml(label)}</strong>
              ${showRemove ? `<button class="small secondary" data-remove-split="${gi}-${ti}" title="Remove this panel">\u00D7</button>` : ''}
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Name</label>
                <input type="text" data-field="terminal-name" data-gi="${gi}" data-ti="${ti}"
                       value="${escapeHtml(term.name)}" placeholder="e.g. Dev Server" />
              </div>
              <div class="form-group">
                <label>Icon</label>
                <button type="button" class="icon-picker-trigger" data-gi="${gi}" data-ti="${ti}">
                  ${term.icon
            ? `<i class="codicon codicon-${escapeHtml(term.icon)}"></i> <span>${escapeHtml(term.icon)}</span>`
            : '<span>Select icon...</span>'}
                </button>
              </div>
              <div class="form-group">
                <label>Color</label>
                <div class="color-picker" data-field="terminal-color" data-gi="${gi}" data-ti="${ti}">
                  <button type="button" class="color-picker-trigger">
                    ${(() => {
            const colorObj = COLOR_OPTIONS.find(o => o.value === term.color);
            const dotHtml = colorObj && colorObj.css
              ? `<span class="color-dot" style="background:${colorObj.css}"></span>`
              : '';
            return `${dotHtml} ${escapeHtml(colorObj?.label || 'Default')}`;
          })()}
                  </button>
                  <div class="color-picker-dropdown">
                    ${COLOR_OPTIONS.map(o =>
            `<div class="color-picker-option ${term.color === o.value ? 'selected' : ''}" data-value="${o.value}">
                        ${o.css ? `<span class="color-dot" style="background:${o.css}"></span>` : ''} ${o.label}
                      </div>`
          ).join('')}
                  </div>
                </div>
              </div>
            </div>
            <div class="form-group" style="margin-top: 8px;">
              <label>Working Directory <span class="field-hint">(optional — relative or absolute)</span></label>
              <input type="text" data-field="terminal-cwd" data-gi="${gi}" data-ti="${ti}"
                     value="${escapeHtml(term.cwd || '')}" placeholder="e.g. ./frontend or /home/user/project" />
            </div>
            <div class="form-group" style="margin-top: 8px;">
              <label>Commands (one per line, run in order)</label>
              <textarea data-field="terminal-commands" data-gi="${gi}" data-ti="${ti}"
                        placeholder="npm run dev">${escapeHtml(term.commands.join('\n'))}</textarea>
            </div>
          </div>
        `;
      }

      const count = group.splitCount || 1;
      const panelLabels = ['Left', 'Center Left', 'Center Right', 'Right'];
      let terminalsHtml;

      if (count === 1) {
        const term = group.terminals[0] || { name: '', commands: [''], icon: '', color: '' };
        terminalsHtml = renderTerminalCard(term, 0, 'Terminal', false);
      } else {
        // Build N panes side-by-side
        let panes = '';
        for (let ti = 0; ti < count; ti++) {
          const term = group.terminals[ti] || { name: '', commands: [''], icon: '', color: '' };
          let label;
          if (count === 2) {
            label = ti === 0 ? 'Left Panel' : 'Right Panel';
          } else if (count === 3) {
            label = ['Left', 'Center', 'Right'][ti] + ' Panel';
          } else {
            label = panelLabels[ti] + ' Panel';
          }
          if (ti > 0) panes += '<div class="split-divider"></div>';
          panes += `<div class="split-pane">${renderTerminalCard(term, ti, label, count > 1)}</div>`;
        }
        terminalsHtml = `<div class="split-container split-${count}">${panes}</div>`;
      }

      const splitOptions = [1, 2, 3, 4].map(n =>
        `<option value="${n}" ${count === n ? 'selected' : ''}>${n === 1 ? 'No split (single terminal)' : n + ' panels side-by-side'}</option>`
      ).join('');

      return `
        <div class="group-section">
          <div class="group-header">
            <h3>Group ${gi + 1}</h3>
            ${p.groups.length > 1
          ? `<button class="small secondary" data-remove-group="${gi}">Remove Group</button>`
          : ''}
          </div>
          <div class="form-group split-select-row">
            <label>Terminal Layout</label>
            <select data-field="group-split" data-gi="${gi}">${splitOptions}</select>
          </div>
          ${terminalsHtml}
        </div>
      `;
    }).join('');

    app.innerHTML = `
      <h1>${p.name ? 'Edit Profile' : 'New Profile'}</h1>
      <div id="profile-editor">
        <div class="form-group">
          <label>Profile Name</label>
          <input type="text" id="profile-name" value="${escapeHtml(p.name)}" placeholder="e.g. My Dev Setup" />
          <span id="profile-name-error" class="field-error" style="display:none;">Profile name is required</span>
        </div>
        <div class="toggle-card ${p.closeOnRelaunch ? 'toggle-card-on' : ''}">
          <div class="toggle-card-text">
            <span class="toggle-card-title"><i class="codicon codicon-close-all"></i> Close on Relaunch</span>
            <span class="toggle-card-desc">Automatically close this profile's terminals before relaunching</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="close-on-relaunch" ${p.closeOnRelaunch ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <h2>Terminal Groups</h2>
        ${groupsHtml}
        <button class="secondary" id="btn-add-group">+ Add Terminal Group</button>
        <div class="action-bar">
          <button id="btn-save">Save Profile</button>
          <button class="secondary" id="btn-cancel">Cancel</button>
        </div>
      </div>
    `;

    bindEditorEvents();
  }

  function bindEditorEvents() {

    // Terminal fields (name, commands)
    document.querySelectorAll('[data-field^="terminal-"]').forEach(el => {
      const field = el.getAttribute('data-field');
      if (field === 'terminal-color') return; // handled by color picker
      const gi = parseInt(el.getAttribute('data-gi'));
      const ti = parseInt(el.getAttribute('data-ti'));
      const event = el.tagName === 'SELECT' ? 'change' : 'input';

      el.addEventListener(event, (e) => {
        const term = editingProfile.groups[gi].terminals[ti];
        if (field === 'terminal-name') {
          term.name = e.target.value;
        } else if (field === 'terminal-cwd') {
          term.cwd = e.target.value;
        } else if (field === 'terminal-commands') {
          term.commands = e.target.value.split('\n');
        }
      });
    });

    // Color picker dropdowns
    document.querySelectorAll('.color-picker').forEach(picker => {
      const gi = parseInt(picker.getAttribute('data-gi'));
      const ti = parseInt(picker.getAttribute('data-ti'));
      const trigger = picker.querySelector('.color-picker-trigger');
      const dropdown = picker.querySelector('.color-picker-dropdown');

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.color-picker-dropdown.open').forEach(d => {
          if (d !== dropdown) d.classList.remove('open');
        });
        dropdown.classList.toggle('open');
      });

      dropdown.querySelectorAll('.color-picker-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const value = opt.getAttribute('data-value');
          const term = editingProfile.groups[gi].terminals[ti];
          term.color = value;
          const colorObj = COLOR_OPTIONS.find(o => o.value === value);
          const dotHtml = colorObj && colorObj.css
            ? `<span class="color-dot" style="background:${colorObj.css}"></span>`
            : '';
          trigger.innerHTML = `${dotHtml} ${escapeHtml(colorObj?.label || 'Default')}`;
          dropdown.querySelectorAll('.color-picker-option').forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
          dropdown.classList.remove('open');
        });
      });
    });

    // Close color picker dropdowns when clicking outside
    document.addEventListener('click', () => {
      document.querySelectorAll('.color-picker-dropdown.open').forEach(d => d.classList.remove('open'));
    });

    // Icon picker trigger buttons — open modal
    document.querySelectorAll('.icon-picker-trigger').forEach(btn => {
      const gi = parseInt(btn.getAttribute('data-gi'));
      const ti = parseInt(btn.getAttribute('data-ti'));

      btn.addEventListener('click', () => {
        const term = editingProfile.groups[gi].terminals[ti];
        openIconPicker(term.icon, (selectedValue) => {
          term.icon = selectedValue;
          // Update button display
          if (selectedValue) {
            btn.innerHTML = `<i class="codicon codicon-${escapeHtml(selectedValue)}"></i> <span>${escapeHtml(selectedValue)}</span>`;
          } else {
            btn.innerHTML = '<span>Select icon...</span>';
          }
        });
      });
    });

    // Remove split pane buttons
    document.querySelectorAll('[data-remove-split]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const [gi, ti] = e.currentTarget.getAttribute('data-remove-split').split('-').map(Number);
        const group = editingProfile.groups[gi];
        group.terminals.splice(ti, 1);
        group.splitCount = Math.max(1, group.splitCount - 1);
        renderEditor();
      });
    });

    // Group split count dropdown
    document.querySelectorAll('[data-field="group-split"]').forEach(el => {
      const gi = parseInt(el.getAttribute('data-gi'));
      el.addEventListener('change', (e) => {
        const group = editingProfile.groups[gi];
        const newCount = parseInt(e.target.value);
        group.splitCount = newCount;
        // Adjust terminals array to match new count
        while (group.terminals.length < newCount) {
          group.terminals.push({ name: '', commands: [''], icon: '', color: '' });
        }
        group.terminals = group.terminals.slice(0, newCount);
        renderEditor();
      });
    });

    // Add group
    document.getElementById('btn-add-group')?.addEventListener('click', () => {
      editingProfile.groups.push({
        splitCount: 1,
        terminals: [{ name: '', commands: [''], icon: '', color: '' }],
      });
      renderEditor();
    });

    // Remove group buttons
    document.querySelectorAll('[data-remove-group]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const gi = parseInt(e.currentTarget.getAttribute('data-remove-group'));
        editingProfile.groups.splice(gi, 1);
        renderEditor();
      });
    });

    // Close-on-relaunch toggle
    document.getElementById('close-on-relaunch')?.addEventListener('change', (e) => {
      editingProfile.closeOnRelaunch = e.target.checked;
      const card = e.target.closest('.toggle-card');
      if (card) card.classList.toggle('toggle-card-on', e.target.checked);
    });

    // Clear validation on name input
    document.getElementById('profile-name')?.addEventListener('input', (e) => {
      editingProfile.name = e.target.value;
      const nameInput = e.target;
      const errorEl = document.getElementById('profile-name-error');
      if (nameInput.value.trim()) {
        nameInput.classList.remove('input-error');
        if (errorEl) errorEl.style.display = 'none';
      }
    });

    // Save
    document.getElementById('btn-save')?.addEventListener('click', () => {
      const nameInput = document.getElementById('profile-name');
      const errorEl = document.getElementById('profile-name-error');

      if (!editingProfile.name.trim()) {
        nameInput.classList.add('input-error');
        if (errorEl) errorEl.style.display = 'block';
        nameInput.focus();
        return;
      }

      // Validate at least one group with one terminal
      const hasTerminal = editingProfile.groups.some(g => g.terminals.length > 0);
      if (!hasTerminal) {
        alert('Please add at least one terminal.');
        return;
      }
      vscode.postMessage({ command: 'saveProfile', profile: editingProfile });
    });

    // Cancel
    document.getElementById('btn-cancel')?.addEventListener('click', () => {
      editingProfile = null;
      renderProfileList();
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
})();
