"use strict";
const path=require("node:path");
const {pathToFileURL}=require("node:url");
const {app,BrowserWindow,protocol,net,shell}=require("electron");

protocol.registerSchemesAsPrivileged([{
  scheme:"ritm",
  privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}
}]);

const root=path.resolve(__dirname,"..");
const gotSingleInstance=app.requestSingleInstanceLock();
if(!gotSingleInstance){app.quit();}
else{
  let mainWindow;
  app.on("second-instance",()=>{
    if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.focus();}
  });
  app.setAppUserModelId("ru.timaosadok.ritm");
  app.whenReady().then(()=>{
    protocol.handle("ritm",(request)=>{
      const u=new URL(request.url);
      if(u.hostname!=="app")return new Response("Not found",{status:404});
      const relative=decodeURIComponent(u.pathname).replace(/^\/+/, "")||"index.html";
      const absolute=path.resolve(root,relative);
      if(relative.includes("..")||!absolute.startsWith(root+path.sep)){
        return new Response("Forbidden",{status:403});
      }
      return net.fetch(pathToFileURL(absolute).toString());
    });
    mainWindow=new BrowserWindow({
      title:"РИТМ",
      width:1120,height:820,minWidth:375,minHeight:540,
      backgroundColor:"#080b10",
      autoHideMenuBar:true,
      icon:path.join(root,"icons","icon-512.png"),
      webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}
    });
    mainWindow.setMenu(null);
    mainWindow.webContents.setWindowOpenHandler(({url})=>{
      if(url.startsWith("https://"))shell.openExternal(url).catch(()=>{});
      return {action:"deny"};
    });
    mainWindow.webContents.on("will-navigate",(event,url)=>{
      if(!url.startsWith("ritm://app/"))event.preventDefault();
    });
    mainWindow.loadURL("ritm://app/index.html").catch(error=>{
      console.error("РИТМ: ошибка загрузки приложения",error);
    });
    app.on("activate",()=>{
      if(BrowserWindow.getAllWindows().length===0)app.emit("ready");
    });
  });
  app.on("window-all-closed",()=>{
    if(process.platform!=="darwin")app.quit();
  });
}
