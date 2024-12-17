const { app, BrowserWindow } = require('electron')
const path = require("path")

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
    })

    // 使用 loadFile 加载 electron/index.html 文件
    mainWindow.loadFile(path.join(__dirname, "./index.html"));
}

// 在应用准备就绪时调用函数
app.whenReady().then(() => {
    createWindow()
})