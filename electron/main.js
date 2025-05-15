import { createRequire } from 'module';
// 从node.js 14版及以上版本中，require作为COMMONJS的一个命令已不再直接支持使用，所以我们需要导入createRequire命令才可以
const require = createRequire(import.meta.url);

const { app, BrowserWindow } = require('electron')
const path = require("path")

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 700,
    })

    // 开发环境使用本地服务器，生产环境使用打包后的文件
    if (isDev) {
        mainWindow.loadURL("http://localhost:7500/")
        // 打开开发工具
        mainWindow.webContents.openDevTools()
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }
}

// 在应用准备就绪时调用函数
app.whenReady().then(() => {
    createWindow()
})

// 关闭所有窗口时退出应用
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})