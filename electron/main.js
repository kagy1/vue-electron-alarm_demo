import { createRequire } from 'module';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// 从node.js 14版及以上版本中，require作为COMMONJS的一个命令已不再直接支持使用，所以我们需要导入createRequire命令才可以
const require = createRequire(import.meta.url);

const { app, BrowserWindow, powerSaveBlocker, ipcMain } = require('electron')
const path = require("path")
const isDev = process.env.NODE_ENV === 'development';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("__dirname", __dirname);

// 保持对powerSaveBlockerId的引用，以便后续可以停止阻止
let powerSaveBlockerId = null;

// 计时器相关变量
let mainTimer = null;
let startTime = 0;
let totalTime = 0;
let isTimerRunning = false;
let mainWindow = null;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    })

    if (isDev) {
        mainWindow.loadURL("http://localhost:7500/");
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // 防止应用窗口最小化时计时器暂停
    mainWindow.on('minimize', () => {
        if (powerSaveBlockerId === null) {
            // 阻止系统休眠
            powerSaveBlockerId = powerSaveBlocker.start('prevent-display-sleep');
            console.log('[Window] Minimized, power save mode enabled');
        }
    })

    mainWindow.on('restore', () => {
        if (powerSaveBlockerId !== null && !isTimerRunning) {
            powerSaveBlocker.stop(powerSaveBlockerId);
            powerSaveBlockerId = null;
            console.log('[Window] Restored, power save mode disabled');
        }
    })

    // 主进程中的计时器实现
    
    // 开始计时
    ipcMain.on('start-timer', (event, config) => {
        console.log('[Main Process] Timer started with config:', config);
        totalTime = config.time || 25 * 60; // 默认25分钟
        isTimerRunning = true;
        
        // 启用电源保护模式
        if (powerSaveBlockerId === null) {
            powerSaveBlockerId = powerSaveBlocker.start('prevent-display-sleep');
            console.log('[Main Process] Power save mode enabled');
        }
        
        // 记录开始时间
        startTime = Date.now();
        
        // 清除已有计时器
        if (mainTimer) {
            clearInterval(mainTimer);
        }
        
        // 创建新计时器，每秒更新
        mainTimer = setInterval(() => {
            if (!isTimerRunning) return;
            
            // 计算已经过去的时间（秒）
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            
            // 计算剩余时间
            const remaining = Math.max(0, totalTime - elapsed);
            
            // 将当前状态发送给渲染进程
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('timer-update', { 
                    remaining: remaining,
                    isRunning: isTimerRunning
                });
                
                // 检查计时是否结束
                if (remaining === 0) {
                    // 计时结束
                    clearInterval(mainTimer);
                    mainTimer = null;
                    isTimerRunning = false;
                    
                    // 通知渲染进程计时结束
                    mainWindow.webContents.send('timer-complete');
                    
                    // 如果不需要继续电源保护，关闭它
                    if (powerSaveBlockerId !== null && !mainWindow.isMinimized()) {
                        powerSaveBlocker.stop(powerSaveBlockerId);
                        powerSaveBlockerId = null;
                        console.log('[Main Process] Timer finished, power save mode disabled');
                    }
                }
            }
        }, 1000);
    });
    
    // 暂停计时
    ipcMain.on('pause-timer', () => {
        if (isTimerRunning) {
            isTimerRunning = false;
            
            // 计算当前剩余时间
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            totalTime = Math.max(0, totalTime - elapsed);
            
            // 清除计时器
            if (mainTimer) {
                clearInterval(mainTimer);
                mainTimer = null;
            }
            
            console.log('[Main Process] Timer paused, remaining time:', totalTime);
            
            // 如果不在最小化状态，停止电源保护
            if (powerSaveBlockerId !== null && !mainWindow.isMinimized()) {
                powerSaveBlocker.stop(powerSaveBlockerId);
                powerSaveBlockerId = null;
                console.log('[Main Process] Power save mode disabled');
            }
        }
    });
    
    // 重置计时器
    ipcMain.on('reset-timer', (event, config) => {
        // 停止当前计时器
        if (mainTimer) {
            clearInterval(mainTimer);
            mainTimer = null;
        }
        
        isTimerRunning = false;
        totalTime = config.time || 25 * 60;
        
        // 发送重置状态给渲染进程
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('timer-update', { 
                remaining: totalTime,
                isRunning: false
            });
        }
        
        console.log('[Main Process] Timer reset to', totalTime);
        
        // 如果不在最小化状态，停止电源保护
        if (powerSaveBlockerId !== null && !mainWindow.isMinimized()) {
            powerSaveBlocker.stop(powerSaveBlockerId);
            powerSaveBlockerId = null;
            console.log('[Main Process] Power save mode disabled');
        }
    });
    
    // 获取当前计时器状态
    ipcMain.on('get-timer-state', (event) => {
        // 如果计时器正在运行，计算剩余时间
        let remaining = totalTime;
        if (isTimerRunning) {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            remaining = Math.max(0, totalTime - elapsed);
        }
        
        // 发送当前状态给渲染进程
        event.reply('timer-state', {
            remaining: remaining,
            isRunning: isTimerRunning
        });
    });
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

// 在应用退出前确保停止电源管理和计时器
app.on('before-quit', () => {
    if (powerSaveBlockerId !== null) {
        powerSaveBlocker.stop(powerSaveBlockerId);
    }
    
    if (mainTimer) {
        clearInterval(mainTimer);
        mainTimer = null;
    }
})