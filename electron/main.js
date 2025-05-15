import { createRequire } from 'module';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// 从node.js 14版及以上版本中，require作为COMMONJS的一个命令已不再直接支持使用，所以我们需要导入createRequire命令才可以
const require = createRequire(import.meta.url);

const { app, BrowserWindow } = require('electron')
const path = require("path")
const isDev = process.env.NODE_ENV === 'development';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("__dirname", __dirname);


const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 700,
    })

    if (isDev) {
        mainWindow.loadURL("http://localhost:7500/");
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

// 在应用准备就绪时调用函数
app.whenReady().then(() => {
    createWindow()
})