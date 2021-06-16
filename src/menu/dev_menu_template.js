import { app, BrowserWindow, dialog, session } from "electron";
import os from 'os'

let cookiesStr = null;


app.on("ready", () => {
  session.defaultSession.cookies.get({})
  .then((cookies) => {
    cookiesStr = cookies;
  }).catch((error) => {
    cookiesStr = error;
  })
});

const clipText = (text) => {
  const maxLength = 90;
  if (text.length < maxLength){
    return text;
  }

  const ellipsis = '...';
  const indexStart = 0;
  return text.substr(indexStart, maxLength - ellipsis.length) + ellipsis
} 

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
      accelerator: "F12",
      click: () => {
        BrowserWindow.getFocusedWindow().toggleDevTools();
      }
    },
    {
      label: "Show Local Storage",
      accelerator: "Alt+F1",
      click: () => {
        BrowserWindow.getFocusedWindow().webContents
        .executeJavaScript('({...localStorage});', true)
        .then(localStorage => {
          let lines = []
          const cognitoKey= "CognitoIdentityServiceProvider"
          Object.keys(localStorage).sort((a, b) => a.localeCompare(b)).forEach(key => {
            if (key.indexOf(cognitoKey) < 0){  //Skip cognito keys - not interested in amplify's own keys
              lines.push(`${clipText(key)}: ${clipText(localStorage[key])}`)
            }
          })

          lines.push(`${os.EOL}(Cognito keys were skipped to keep the output readable.)`)
          
          const options = {
            type: 'info',
            title: 'Local Storage',
            message: lines.join(os.EOL),
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
        })
      }
    }
  ]
};
