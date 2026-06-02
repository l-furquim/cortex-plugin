# Personal Project Inbox

Vault-scoped Cortex plugin for testing the public plugin API with useful project workflows.

## What It Tests

- Commands: capture a project note, create a daily log, open a dashboard
- Settings: inbox path, daily folder, dashboard path, default project
- Vault read/write: creates and updates Markdown notes
- Workspace: opens generated notes
- UI registrations: status bar item, sidebar item, custom view
- Notifications: sends a success notification after capture

## Development

```bash
bun run build
cortex plugin dev --vault /path/to/vault
```

The build script emits a CommonJS bundle that uses the runtime-provided `cortex-plugin-api` external.

## Useful Test Flow

1. Open a vault in Cortex.
2. Run `bun run build` in this plugin directory.
3. Run `cortex plugin dev --vault /path/to/vault`.
4. Enable `Personal Project Inbox` in Settings -> Plugins.
5. Use the command palette to run `Capture Project Note`.
6. Edit `src/index.ts`, rebuild, and confirm Cortex hot reloads the plugin.
