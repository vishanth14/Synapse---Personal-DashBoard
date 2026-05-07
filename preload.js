// ============================================
// preload.js — Synapse Secure Context Bridge
// ============================================

const { contextBridge, ipcRenderer } = require("electron");

const validReceiveChannels = [
    "notification-click",
    "data-updated",
    "theme-changed",
    "user-logged-in",
    "user-logged-out"
];

const validSendChannels = [
    "read-data",
    "write-data",
    "show-notification",
    "get-app-version"
];

function safeInvoke(channel, ...args) {
    if (!validSendChannels.includes(channel)) {
        return Promise.reject(new Error("Unauthorized IPC channel"));
    }
    return ipcRenderer.invoke(channel, ...args);
}

contextBridge.exposeInMainWorld("lifeOS", {

    readData: async (fileName) => {
        try {
            return await safeInvoke("read-data", fileName);
        } catch (error) {
            console.error("Read Data Error:", error);
            return [];
        }
    },

    writeData: async (fileName, data) => {
        try {
            return await safeInvoke("write-data", fileName, data);
        } catch (error) {
            console.error("Write Data Error:", error);
            return false;
        }
    },

    showNotification: async (options = {}) => {
        try {
            return await safeInvoke("show-notification", {
                title: options.title || "Synapse",
                body: options.body || "",
                silent: options.silent || false
            });
        } catch (error) {
            console.error("Notification Error:", error);
        }
    },

    getAppVersion: async () => {
        try {
            return await safeInvoke("get-app-version");
        } catch (error) {
            return "0.0.0";
        }
    },

    on: (channel, callback) => {
        if (!validReceiveChannels.includes(channel)) return;
        ipcRenderer.on(channel, (event, ...args) => callback(...args));
    },

    once: (channel, callback) => {
        if (!validReceiveChannels.includes(channel)) return;
        ipcRenderer.once(channel, (event, ...args) => callback(...args));
    },

    removeListener: (channel, callback) => {
        if (!validReceiveChannels.includes(channel)) return;
        ipcRenderer.removeListener(channel, callback);
    },

    removeAllListeners: (channel) => {
        if (!validReceiveChannels.includes(channel)) return;
        ipcRenderer.removeAllListeners(channel);
    }

});

console.log("%cSynapse Secure Bridge Loaded", "color:#c9a84c;font-size:14px;font-weight:bold;");