import { app, BrowserWindow, ipcMain, Menu, session, shell, Tray } from "electron";
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
const log = require("electron-log")
const appUrl = "https://prod.sococo5k.com"



app.on('web-contents-created', (event, contents) => {

  // https://www.electronjs.org/docs/tutorial/security#11-verify-webview-options-before-creation
  contents.on('will-attach-webview', (event, webPreferences, params) => {
    // Strip away preload scripts if unused or verify their location is legitimate
    delete webPreferences.preload
    delete webPreferences.preloadURL

    // Disable Node.js integration
    webPreferences.nodeIntegration = false

    // Enable context isolation
    webPreferences.contextIsolation = true

    // Verify URL being loaded
    if (!params.src.startsWith(appUrl)) {
      event.preventDefault()
    }
  })

  // https://www.electronjs.org/docs/tutorial/security#12-disable-or-limit-navigation
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)

    if (parsedUrl.origin !== appUrl) {
      event.preventDefault()
    }
  })
  
})

// A reference here is needed otherwise tray will be garbage collected a few mins after app is loaded.
// https://www.electronjs.org/docs/faq#my-apps-tray-disappeared-after-a-few-minutes
let tray = null;
let mainWindow = null;

// Save userData in separate folders for each environment.
// Thanks to this you can use production and development versions of the app
// on same machine like those are two separate apps.
if (env.name !== "production") {
  const userDataPath = app.getPath("userData");
  app.setPath("userData", `${userDataPath} (${env.name})`);
}

// In case you want to pass info from the main process (node js) to the rendered process (browser window),
// you can use ipcMain (https://www.electronjs.org/docs/api/ipc-main) or call mainWindow.webContents.send(...) 
// within this function and then handle the data on Sococo Frontend.
function sendStatusToWindow(text) {
  log.info(text);
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

  // https://www.electronjs.org/docs/tutorial/security#4-handle-session-permission-requests-from-remote-content
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const url = webContents.getURL()

    let permissionGranted = url.startsWith(appUrl) && (permission === 'notifications' || permission === 'media');
    
    if (permissionGranted){
      log.info(`Permission granted. Permission: ${permission}, URL: ${url}`)
    }else{
      log.error(`Permission denied. Permission: ${permission}, URL: ${url}`)
    }

    callback(permissionGranted);
  })

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

  //Paths on dev and production differ depending on how you start the app on dev (i.e. the start command on package.json)
  const iconPath = env.name === "production" ? path.join(process.resourcesPath, 'icon.ico') : path.join(__dirname, '..', 'resources', 'icon.ico');

  mainWindow = createWindow("main", {
    width: 1000,
    height: 600,
    webPreferences: {
      // Spectron needs access to remote module
      enableRemoteModule: env.name === "test"
    },
    icon: iconPath
  });

  //Not needed - Kept here for quick testing purposes only
  /*
  const window2 = createWindow("window2", {
    parent: mainWindow,
    modal: true,
    width: 320,
    height: 320,
    useContentSize: true,
    icon: iconPath,
    resizable: false,
    webPreferences: {
      // Two properties below are here for demo purposes, and are
      // security hazard. Make sure you know what you're doing
      // in your production app.
      nodeIntegration: true,
      contextIsolation: false,
      // Spectron needs access to remote module
      enableRemoteModule: env.name === "test"
    },
  });

  window2.loadURL(
    url.format({
      pathname: path.join(__dirname, "app.html"),
      protocol: "file:",
      slashes: true
    })
  );
*/

  
  // This is how the electron app is connected to the Sococo backend
  mainWindow.loadURL('https://prod.sococo5k.com/');
  const versions = process.versions;

  //By default, the title comes from the app name on package JSON.
  // The code below allows overriding that title without changing the package JSON.
  mainWindow.webContents.on("did-finish-load", (event, input) => {
    mainWindow.setTitle(`${app.getName()} ${app.getVersion()} (Electron:${versions.electron}, Node: ${versions.node}, Chrome: ${versions.chrome})`)
  })

  //For troubleshooting only
  //console.log(`Icon path: ${iconPath}`)

  // Although the tray is not used anywhere else, we have to define the variable at top level
  // so that it is not garbage collected. Otherwise, ca 1 min after your app started,
  // the tray menu will disappear.
  // https://www.electronjs.org/docs/faq#my-apps-tray-disappeared-after-a-few-minutes
  tray = new Tray(iconPath)

  const trayContextMenu = Menu.buildFromTemplate([
    {
      label: "Toggle DevTools",
      type: 'normal',
      accelerator: "F12",
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

  autoUpdater.logger = log
  autoUpdater.logger.transports.file.level = "info"

  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('Checking for update...');
  })
  autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('Update available.');
  })
  autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('Update not available.');
  })
  autoUpdater.on('error', (err) => {
    sendStatusToWindow('Error in auto-updater. ' + err);
  })

  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    sendStatusToWindow(log_message);
    mainWindow.setProgressBar(progressObj.percent)
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('Update downloaded');
  });

  //This is the line that triggers auto update check & update execution
  autoUpdater.checkForUpdatesAndNotify()

});

app.on("window-all-closed", () => {
  app.quit();
});


