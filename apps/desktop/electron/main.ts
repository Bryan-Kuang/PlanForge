import { app, BrowserWindow, shell, ipcMain, dialog } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import { DatabaseService } from "./database.js";
import { AIServiceManager } from "./ai-manager.js";

// --- ERROR HANDLING SETUP ---

process.on("uncaughtException", (error) => {
  console.error("CRITICAL: Uncaught Exception:", error.stack || error);
  dialog.showErrorBox(
    "Critical Error",
    `Uncaught Exception: ${error.message}\nCheck console for details.`
  );
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("CRITICAL: Unhandled Rejection:", reason);
  dialog.showErrorBox(
    "Critical Error",
    `Unhandled Rejection: ${String(reason)}\nCheck console for details.`
  );
  process.exit(1);
});

// ---------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(__dirname, "..");
export const RENDERER_DIST = path.join(__dirname, "..", "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(__dirname, "..", "public")
  : RENDERER_DIST;

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  console.log("Could not acquire single instance lock. Quitting.");
  app.quit();
  process.exit(0);
}

let win: BrowserWindow | null = null;
let db: any | null = null;
let aiService: AIServiceManager | null = null;
let dbInitialized = false;

const preload = path.join(__dirname, "preload.js");
const url = process.env.VITE_DEV_SERVER_URL;

function ensureDatabase() {
  if (!db || !dbInitialized) {
    throw new Error(
      "Database not initialized. Please restart the application."
    );
  }
  return db;
}

function getAIService(): AIServiceManager {
  if (!aiService) {
    aiService = new AIServiceManager();
  }
  if (db && dbInitialized) {
    aiService.setDatabase(db);
  }
  return aiService;
}

function initializeAIService() {
  console.log("Initializing AI Service...");
  getAIService();

  ipcMain.handle("ai:initialize", async (_, apiKey: string) => {
    return await getAIService().initialize(apiKey);
  });

  ipcMain.handle(
    "ai:generate-plan",
    async (_, goal: string, timeframe?: string) => {
      return await getAIService().generatePlan(goal, timeframe);
    }
  );

  ipcMain.handle(
    "ai:enhance-task",
    async (_, taskTitle: string, context: string) => {
      return await getAIService().enhanceTask(taskTitle, context);
    }
  );

  ipcMain.handle(
    "ai:suggest-next-steps",
    async (
      _,
      planTitle: string,
      completedTasks: string[],
      remainingTasks: string[]
    ) => {
      return await getAIService().suggestNextSteps(
        planTitle,
        completedTasks,
        remainingTasks
      );
    }
  );

  ipcMain.handle(
    "ai:generate-tasks",
    async (
      _,
      planTitle: string,
      planGoal: string,
      existingTasks: string[],
      existingMilestones: string[],
      count?: number
    ) => {
      return await getAIService().generateTasks(
        planTitle,
        planGoal,
        existingTasks,
        existingMilestones,
        count
      );
    }
  );

  ipcMain.handle("ai:get-api-key", async () => {
    return await getAIService().getApiKey();
  });

  ipcMain.handle("ai:set-api-key", async (_, apiKey: string) => {
    return await getAIService().setApiKey(apiKey);
  });

  ipcMain.handle("ai:delete-api-key", async () => {
    return await getAIService().deleteApiKey();
  });
  console.log("AI Service initialized.");
}

initializeAIService();

async function createWindow() {
  console.log("Creating main window...");
  win = new BrowserWindow({
    title: "PlanForge",
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: "default",
    show: false,
  });

  win.once("ready-to-show", () => {
    console.log("Window ready to show.");
    win?.show();

    if (VITE_DEV_SERVER_URL) {
      win?.webContents.openDevTools();
    }
  });

  win.webContents.on("did-finish-load", () => {
    console.log("Window finished loading.");
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    console.log("Loading Dev Server URL:", VITE_DEV_SERVER_URL);
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(RENDERER_DIST, "index.html");
    console.log("Loading production index:", indexPath);
    win.loadFile(indexPath);
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });
  console.log("Window created successfully.");
}

app.whenReady().then(async () => {
  console.log("App is ready. Initializing database...");
  try {
    db = new DatabaseService();
    await db.initialize();
    dbInitialized = true;
    console.log("Database initialized successfully");

    if (aiService) {
      aiService.setDatabase(db);
    }
  } catch (error) {
    console.log("Failed to initialize database:", error);

    const result = await dialog.showMessageBox({
      type: "error",
      title: "Database Error",
      message: "Failed to initialize database",
      detail: `Error: ${
        error instanceof Error ? error.message : String(error)
      }\n\nThe application may not function correctly.`,
      buttons: ["Continue Anyway", "Exit"],
      defaultId: 1,
      cancelId: 1,
    });

    if (result.response === 1) {
      console.log("User chose to exit on DB error.");
      app.quit();
      return;
    }

    dbInitialized = false;
    console.log("User chose to continue without DB.");
  }

  createWindow();
});

app.on("window-all-closed", () => {
  console.log("All windows closed.");
  win = null;
  if (process.platform !== "darwin") app.quit();
});

app.on("second-instance", () => {
  console.log("Second instance detected.");
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on("activate", () => {
  console.log("App activated.");
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length === 0) {
    createWindow();
  } else {
    allWindows[0].focus();
  }
});

ipcMain.handle("open-win", (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`);
  } else {
    childWindow.loadFile(path.join(RENDERER_DIST, "index.html"), { hash: arg });
  }
});

app.on("before-quit", async () => {
  console.log("App is quitting (before-quit).");
  if (db && dbInitialized) {
    await db.disconnect();
  }
});

// IPC handlers
ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

ipcMain.handle("get-platform", () => {
  return process.platform;
});

ipcMain.handle("db:test-connection", async () => {
  try {
    const database = ensureDatabase();
    await database.initialize();
    return { success: true };
  } catch (error) {
    console.error("Database connection test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

// Plan operations
ipcMain.handle("db:create-plan", async (_, data) => {
  try {
    const database = ensureDatabase();
    return await database.createPlan(data);
  } catch (error) {
    console.error("Error creating plan:", error);
    throw error;
  }
});

ipcMain.handle("db:get-plans", async () => {
  try {
    const database = ensureDatabase();
    return await database.getPlans();
  } catch (error) {
    console.error("Error getting plans:", error);
    throw error;
  }
});

ipcMain.handle("db:get-plan", async (_, id) => {
  try {
    const database = ensureDatabase();
    return await database.getPlan(id);
  } catch (error) {
    console.error("Error getting plan:", error);
    throw error;
  }
});

ipcMain.handle("db:update-plan", async (_, id, data) => {
  try {
    const database = ensureDatabase();
    return await database.updatePlan(id, data);
  } catch (error) {
    console.error("Error updating plan:", error);
    throw error;
  }
});

ipcMain.handle("db:delete-plan", async (_, id) => {
  try {
    const database = ensureDatabase();
    return await database.deletePlan(id);
  } catch (error) {
    console.error("Error deleting plan:", error);
    throw error;
  }
});

// Milestone operations
ipcMain.handle("db:create-milestone", async (_, data) => {
  try {
    const database = ensureDatabase();
    return await database.createMilestone(data);
  } catch (error) {
    console.error("Error creating milestone:", error);
    throw error;
  }
});

ipcMain.handle("db:update-milestone", async (_, id, data) => {
  try {
    const database = ensureDatabase();
    return await database.updateMilestone(id, data);
  } catch (error) {
    console.error("Error updating milestone:", error);
    throw error;
  }
});

ipcMain.handle("db:delete-milestone", async (_, id) => {
  try {
    const database = ensureDatabase();
    return await database.deleteMilestone(id);
  } catch (error) {
    console.error("Error deleting milestone:", error);
    throw error;
  }
});

// Task operations
ipcMain.handle("db:create-task", async (_, data) => {
  try {
    const database = ensureDatabase();
    return await database.createTask(data);
  } catch (error) {
    console.error("Error creating task:", error);
    throw error;
  }
});

ipcMain.handle("db:update-task", async (_, id, data) => {
  try {
    const database = ensureDatabase();
    return await database.updateTask(id, data);
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
});

ipcMain.handle("db:delete-task", async (_, id) => {
  try {
    const database = ensureDatabase();
    return await database.deleteTask(id);
  } catch (error) {
    console.error("Error deleting task:", error);
    throw error;
  }
});

// Task dependency operations
ipcMain.handle(
  "db:create-task-dependency",
  async (_, dependentId, prerequisiteId) => {
    try {
      const database = ensureDatabase();
      return await database.createTaskDependency(dependentId, prerequisiteId);
    } catch (error) {
      console.error("Error creating task dependency:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "db:delete-task-dependency",
  async (_, dependentId, prerequisiteId) => {
    try {
      const database = ensureDatabase();
      return await database.deleteTaskDependency(dependentId, prerequisiteId);
    } catch (error) {
      console.error("Error deleting task dependency:", error);
      throw error;
    }
  }
);

// Resource operations
ipcMain.handle("db:create-resource", async (_, data) => {
  try {
    const database = ensureDatabase();
    return await database.createResource(data);
  } catch (error) {
    console.error("Error creating resource:", error);
    throw error;
  }
});

ipcMain.handle("db:update-resource", async (_, id, data) => {
  try {
    const database = ensureDatabase();
    return await database.updateResource(id, data);
  } catch (error) {
    console.error("Error updating resource:", error);
    throw error;
  }
});

ipcMain.handle("db:delete-resource", async (_, id) => {
  try {
    const database = ensureDatabase();
    return await database.deleteResource(id);
  } catch (error) {
    console.error("Error deleting resource:", error);
    throw error;
  }
});

// Settings operations
ipcMain.handle("db:get-settings", async () => {
  try {
    const database = ensureDatabase();
    return await database.getSettings();
  } catch (error) {
    console.error("Error getting settings:", error);
    throw error;
  }
});

ipcMain.handle("db:update-settings", async (_, data) => {
  try {
    const database = ensureDatabase();
    return await database.updateSettings(data);
  } catch (error) {
    console.error("Error updating settings:", error);
    throw error;
  }
});

// Statistics operations
ipcMain.handle("db:get-plan-stats", async (_, planId) => {
  try {
    const database = ensureDatabase();
    return await database.getPlanStats(planId);
  } catch (error) {
    console.error("Error getting plan stats:", error);
    throw error;
  }
});

ipcMain.handle("db:get-dashboard-stats", async () => {
  try {
    const database = ensureDatabase();
    return await database.getDashboardStats();
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    throw error;
  }
});
