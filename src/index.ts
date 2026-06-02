import { CortexPlugin, type ViewDescriptor, type ViewDispatch, type ViewState } from "cortex-plugin-api";

interface ProjectInboxSettings {
  inboxPath: string;
  dailyFolder: string;
  dashboardPath: string;
  defaultProject: string;
}

interface ProjectActionState {
  lastAction?: string;
}

const defaultSettings: ProjectInboxSettings = {
  inboxPath: "Projects/Inbox.md",
  dailyFolder: "Projects/Daily",
  dashboardPath: "Projects/Dashboard.md",
  defaultProject: "General",
};

export default class UsersFurqasProjectsPersonalPlugin extends CortexPlugin {
  onload(): void {
    this.registerSettingsTab({
      id: "project-inbox-settings",
      label: "Project Inbox",
      icon: "folder-kanban",
      settings: [
        {
          key: "inboxPath",
          label: "Inbox note",
          type: "text",
          default: defaultSettings.inboxPath,
          placeholder: defaultSettings.inboxPath,
        },
        {
          key: "dailyFolder",
          label: "Daily folder",
          type: "text",
          default: defaultSettings.dailyFolder,
          placeholder: defaultSettings.dailyFolder,
        },
        {
          key: "dashboardPath",
          label: "Dashboard note",
          type: "text",
          default: defaultSettings.dashboardPath,
          placeholder: defaultSettings.dashboardPath,
        },
        {
          key: "defaultProject",
          label: "Default alterei agora",
          type: "text",
          default: defaultSettings.defaultProject,
          placeholder: defaultSettings.defaultProject,
        },
      ],
    });

    this.addCommand({
      id: "capture-project-note",
      label: "Capture Project Note",
      category: "Project Inbox",
      icon: "plus-circle",
      execute: () => this.captureProjectNote(),
    });

    this.addCommand({
      id: "open-project-dashboard",
      label: "Open Project Dashboard",
      category: "Project Inbox",
      icon: "layout-dashboard",
      execute: () => this.openDashboard(),
    });

    this.addCommand({
      id: "create-daily-project-log",
      label: "Create Daily Project Log",
      category: "Project Inbox",
      icon: "calendar-plus",
      execute: () => this.createDailyLog(),
    });

    this.registerStatusBarItem({
      id: "project-inbox-status",
      position: "right",
      icon: "folder-kanban",
      text: "Project Inbox",
      tooltip: "Capture project notes into your vault",
      onClick: () => this.openDashboard(),
    });

    this.registerView({
      id: "project-inbox-view",
      label: "Project Inbox",
      icon: "folder-kanban",
      location: "sidebar-right",
      initialState: {},
      render: (state, dispatch) => this.renderProjectView(state, dispatch),
      reduce: (state, action) => this.reduceProjectView(state as ProjectActionState, action),
    });

    this.registerSidebarItem({
      id: "project-inbox-sidebar",
      label: "Project Inbox",
      icon: "folder-kanban",
      viewId: "project-inbox-view",
    });
  }

  private getSettings(): ProjectInboxSettings {
    return {
      inboxPath: this.api.settings.get<string>("inboxPath") ?? defaultSettings.inboxPath,
      dailyFolder: this.api.settings.get<string>("dailyFolder") ?? defaultSettings.dailyFolder,
      dashboardPath: this.api.settings.get<string>("dashboardPath") ?? defaultSettings.dashboardPath,
      defaultProject: this.api.settings.get<string>("defaultProject") ?? defaultSettings.defaultProject,
    };
  }

  private renderProjectView(state: ViewState, _dispatch: ViewDispatch): ViewDescriptor {
    const lastAction = (state.state as ProjectActionState).lastAction ?? "Ready";
    return {
      type: "stack",
      children: [
        { type: "heading", props: { value: "Project Inbox" } },
        { type: "text", props: { value: lastAction } },
        { type: "button", props: { label: "Capture note", action: "capture" } },
        { type: "button", props: { label: "Daily log", action: "daily" } },
        { type: "button", props: { label: "Dashboard", action: "dashboard" } },
      ],
    };
  }

  private reduceProjectView(state: ProjectActionState, action: string): ProjectActionState {
    if (action === "capture") {
      void this.captureProjectNote();
      return { ...state, lastAction: "Captured a project note" };
    }
    if (action === "daily") {
      void this.createDailyLog();
      return { ...state, lastAction: "Opened today's project log" };
    }
    if (action === "dashboard") {
      void this.openDashboard();
      return { ...state, lastAction: "Opened dashboard" };
    }
    return state;
  }

  private async captureProjectNote(): Promise<void> {
    const settings = this.getSettings();
    const activeFile = this.api.editor.getActiveFilePath();
    const source = activeFile ? ` from [[${activeFile}]]` : "";
    const entry = `- [ ] ${this.formatTimestamp()} ${settings.defaultProject}: Capture next action${source}\n`;
    await this.appendToNote(settings.inboxPath, "# Project Inbox\n\n", entry);
    this.api.workspace.openFile(settings.inboxPath);
    await this.notify({ title: "Project note captured", body: settings.inboxPath, kind: "success" });
  }

  private async createDailyLog(): Promise<void> {
    const settings = this.getSettings();
    const path = `${settings.dailyFolder}/${this.formatDate()}.md`;
    const template = [`# ${this.formatDate()} Project Log`, "", "## Focus", "", "- ", "", "## Notes", "", ""].join(
      "\n",
    );
    await this.ensureNote(path, template);
    this.api.workspace.openFile(path);
  }

  private async openDashboard(): Promise<void> {
    const settings = this.getSettings();
    const files = await this.api.vault.listFiles("");
    const markdownCount = files.filter((file) => !file.isDir && file.path.endsWith(".md")).length;
    const dashboard = [
      "# Project Dashboard",
      "",
      `- Inbox: [[${settings.inboxPath}]]`,
      `- Daily folder: ${settings.dailyFolder}`,
      `- Markdown files at vault root: ${markdownCount}`,
      `- Last refreshed: ${this.formatTimestamp()}`,
      "",
    ].join("\n");
    await this.api.vault.writeFile(settings.dashboardPath, dashboard);
    this.api.workspace.openFile(settings.dashboardPath);
  }

  private async appendToNote(path: string, initialContent: string, entry: string): Promise<void> {
    let current = initialContent;
    try {
      current = await this.api.vault.readFile(path);
    } catch {}
    const separator = current.endsWith("\n") ? "" : "\n";
    await this.api.vault.writeFile(path, `${current}${separator}${entry}`);
  }

  private async ensureNote(path: string, content: string): Promise<void> {
    if (await this.api.vault.exists(path)) return;
    await this.api.vault.writeFile(path, content);
  }

  private formatDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private formatTimestamp(): string {
    return new Date().toISOString().slice(0, 16).replace("T", " ");
  }
}
