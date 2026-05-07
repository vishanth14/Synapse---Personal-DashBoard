// ============================================
// main.js — Synapse Electron Main Process
// ============================================

const {
    app,
    BrowserWindow,
    ipcMain,
    Notification,
    dialog
} = require("electron");

const path = require("path");
const fs = require("fs");

let mainWindow = null;

const DATA_DIR = path.join(__dirname, "data");

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 1000,
        minHeight: 700,
        show: false,
        backgroundColor: "#0f172a",
        autoHideMenuBar: true,
        title: "Synapse - Personal Management System",
        icon: path.join(__dirname, "assets", "icon.png"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            devTools: true
        }
    });

    mainWindow.loadFile("index.html");

    mainWindow.once("ready-to-show", () => {
        mainWindow.show();
    });

    if (process.env.NODE_ENV === "development") {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

function initializeDataFiles() {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        const files = {
            "users.json": [],
            "wellness.json": [],
            "finance.json": [],
            "skills.json": [],
            "reminders.json": []
        };

        Object.entries(files).forEach(([fileName, defaultData]) => {
            const filePath = path.join(DATA_DIR, fileName);
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(
                    filePath,
                    JSON.stringify(defaultData, null, 2),
                    "utf8"
                );
            }
        });

    } catch (error) {
        console.error("Data initialization error:", error);
    }
}

function getSafeFilePath(fileName) {
    const safeFiles = [
        "users.json",
        "wellness.json",
        "finance.json",
        "skills.json",
        "reminders.json"
    ];

    if (!safeFiles.includes(fileName)) {
        throw new Error("Invalid file request");
    }

    return path.join(DATA_DIR, fileName);
}

ipcMain.handle("read-data", async (event, fileName) => {
    try {
        const filePath = getSafeFilePath(fileName);
        if (!fs.existsSync(filePath)) return [];
        const rawData = fs.readFileSync(filePath, "utf8");
        return JSON.parse(rawData || "[]");
    } catch (error) {
        console.error(`Read Error (${fileName}):`, error);
        return [];
    }
});

ipcMain.handle("write-data", async (event, fileName, data) => {
    try {
        const filePath = getSafeFilePath(fileName);
        if (!Array.isArray(data)) throw new Error("Data must be an array");
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
        if (mainWindow) {
            mainWindow.webContents.send("data-updated", fileName);
        }
        return { success: true };
    } catch (error) {
        console.error(`Write Error (${fileName}):`, error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle("show-notification", async (event, options) => {
    try {
        if (!Notification.isSupported()) return { success: false };
        const notification = new Notification({
            title: options.title || "Synapse",
            body: options.body || "",
            silent: options.silent || false
        });
        notification.show();
        notification.on("click", () => {
            if (mainWindow) {
                mainWindow.focus();
                mainWindow.webContents.send("notification-click");
            }
        });
        return { success: true };
    } catch (error) {
        console.error("Notification Error:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle("get-app-version", () => app.getVersion());

app.whenReady().then(() => {
    initializeDataFiles();
    createWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("web-contents-created", (event, contents) => {
    contents.on("will-navigate", (event) => { event.preventDefault(); });
    contents.setWindowOpenHandler(() => ({ action: "deny" }));
});

process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    dialog.showErrorBox("Application Error", error.message);
});

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
});

console.log("Synapse Main Process Started");