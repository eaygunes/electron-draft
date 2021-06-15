import { app, BrowserWindow, dialog, session } from "electron";

let cookiesStr = null;


app.on("ready", () => {
  session.defaultSession.cookies.get({})
  .then((cookies) => {
    cookiesStr = cookies;
  }).catch((error) => {
    cookiesStr = error;
  })
});

export default {
  label: "Development",
  submenu: [
    {
      label: "Reload",
      accelerator: "CmdOrCtrl+R",
      click: () => {
        BrowserWindow.getFocusedWindow().webContents.reloadIgnoringCache();
      }
    },
    {
      label: "Toggle DevTools",
      accelerator: "Alt+CmdOrCtrl+I",
      click: () => {
        BrowserWindow.getFocusedWindow().toggleDevTools();
      }
    },
    {
      label: "Show Support Info",
      accelerator: "Alt+F1",
      click: () => {
        const ses = session.fromPartition('persist:name')
        const options = {
          type: 'info',
          title: 'Information',
          message: `Store path: ${ses.getStoragePath()}\n Cookies: ${JSON.stringify(cookiesStr ?? 'Not Set')}`,
          buttons: ['OK']
        }
        dialog.showMessageBox(options, (index) => {
          event.sender.send('information-dialog-selection', index)

          // Query all cookies.
          session.defaultSession.cookies.get({})
            .then((cookies) => {
              console.log(cookies)
            }).catch((error) => {
              console.log(error)
            })
        })
      }
    }
  ]
};
