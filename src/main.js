import { app, BrowserWindow, ipcMain, Menu, shell, Tray } from "electron";
import { autoUpdater } from "electron-updater"
// Special module holding environment variables which you declared
// in config/env_xxx.json file.
import env from "env";
// This is main process of Electron, started as first thing when your
// app starts. It runs through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import path from "path";
import url from "url";

import createWindow from "./helpers/window";
import appMenuTemplate from "./menu/app_menu_template";
import devMenuTemplate from "./menu/dev_menu_template";
import editMenuTemplate from "./menu/edit_menu_template";

const contextMenu = require('electron-context-menu');



// A reference here is needed otherwise tray will be garbage collected a few mins after app is loaded.
// https://www.electronjs.org/docs/faq#my-apps-tray-disappeared-after-a-few-minutes
let tray = null;

// Save userData in separate folders for each environment.
// Thanks to this you can use production and development versions of the app
// on same machine like those are two separate apps.
if (env.name !== "production") {
  const userDataPath = app.getPath("userData");
  app.setPath("userData", `${userDataPath} (${env.name})`);
}

const setApplicationMenu = () => {
  const menus = [appMenuTemplate, editMenuTemplate];
  if (env.name !== "production") {
    menus.push(devMenuTemplate);
  }
  Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
};

// We can communicate with our window (the renderer process) via messages.
const initIpc = () => {
  ipcMain.on("need-app-path", (event, arg) => {
    event.reply("app-path", app.getAppPath());
  });
  ipcMain.on("open-external-link", (event, href) => {
    shell.openExternal(href);
  });
};

app.on("ready", () => {
  setApplicationMenu();
  initIpc();

  contextMenu({
    prepend: (defaultActions, parameters, browserWindow) => [
      {
        label: 'Rainbow',
        // Only show it when right-clicking images
        visible: parameters.mediaType === 'image'
      },
      {
        label: 'Search Google for “{selection}”',
        // Only show it when right-clicking text
        visible: parameters.selectionText.trim().length > 0,
        click: () => {
          shell.openExternal(`https://google.com/search?q=${encodeURIComponent(parameters.selectionText)}`);
        }
      }
    ]
  });

  const iconPath =  env.name === "production" ? path.join(process.resourcesPath, 'icon.ico') : path.join(__dirname, '..', 'resources', 'icon.ico');

  const mainWindow = createWindow("main", {
    width: 1000,
    height: 600,
    webPreferences: {
      // Two properties below are here for demo purposes, and are
      // security hazard. Make sure you know what you're doing
      // in your production app.
      nodeIntegration: true,
      contextIsolation: false,
      // Spectron needs access to remote module
      enableRemoteModule: env.name === "test"
    },
    icon: iconPath
  });

  mainWindow.loadURL('https://prod.sococo5k.com/');
  const versions = process.versions;

  mainWindow.webContents.on("did-finish-load", (event, input) => {
    mainWindow.setTitle(`${app.getName()} ${app.getVersion()} (Electron:${versions.electron}, Node: ${versions.node}, Chrome: ${versions.chrome})`)
  })

  
  console.log(`Icon path: ${iconPath}`)

  tray = new Tray(iconPath)

  const trayContextMenu = Menu.buildFromTemplate([
    {
      label: "Toggle DevTools",
      type: 'normal',
      accelerator: "Alt+CmdOrCtrl+I",
      click: () => {
        mainWindow.toggleDevTools();
      }
    },
    {
      label: 'Quit',
      type: 'normal',
      accelerator: "Alt+F4",
      click: () => { app.quit() }
    },
  ])
  tray.setToolTip('Sococo Electron App')
  tray.setContextMenu(trayContextMenu)


  autoUpdater.logger = require("electron-log")
  autoUpdater.logger.transports.file.level = "warning"
  autoUpdater.checkForUpdatesAndNotify()

});

app.on("window-all-closed", () => {
  app.quit();
});


