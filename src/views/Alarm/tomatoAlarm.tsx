import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import styles from './TomatoClock.module.scss'

// 导入音频文件
// 注意：在Vite/Vue项目中，使用相对路径可能更可靠
import alertSoundPath from '@/assets/ls1.mp3'

// 声明Electron环境下的Window扩展
declare global {
    interface Window {
        require?: (module: string) => any;
    }
}

// 引入electron的ipcRenderer
const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;

export default defineComponent({
    setup(_, { expose }) {
        // 状态定义
        const time: Ref<number> = ref(25 * 60)           // 当前剩余时间(秒)
        const isRunning: Ref<boolean> = ref(false)       // 计时器运行状态
        const isBreak: Ref<boolean> = ref(false)         // 是否处于休息时间
        const workTime: Ref<number> = ref(25)            // 工作时间(分钟)
        const breakTime: Ref<number> = ref(5)            // 休息时间(分钟)
        const alertSound: Ref<HTMLAudioElement | null> = ref(null) // 提示音频
        const soundEnabled: Ref<boolean> = ref(true)     // 声音开关
        const currentNotification: Ref<Notification | null> = ref(null) // 当前通知对象

        /**
         * 格式化时间显示
         * @param seconds 秒数
         * @returns 格式化后的时间字符串 (MM:SS)
         */
        const formatTime = (seconds: number): string => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }

        /**
         * 开始计时器 - 发送指令到主进程
         */
        const startTimer = (): void => {
            if (!isRunning.value) {
                isRunning.value = true;

                // 在开始计时时预加载音频，解决可能的自动播放问题
                if (alertSound.value) {
                    alertSound.value.load();
                }

                if (ipcRenderer) {
                    // 向主进程发送开始计时指令
                    ipcRenderer.send('start-timer', {
                        time: time.value,
                        isBreak: isBreak.value
                    });
                    console.log('[Renderer] Starting timer in main process');
                } else {
                    // 如果不在Electron环境中，使用老方法，方便开发调试
                    legacyStartTimer();
                }
            }
        };

        /**
         * 旧的计时方法 - 仅在非Electron环境使用
         */
        let legacyTimer: number | null = null;
        const legacyStartTimer = (): void => {
            if (legacyTimer) return;

            legacyTimer = window.setInterval(() => {
                if (time.value > 0) {
                    time.value--;
                } else {
                    handleTimerComplete();
                }
            }, 1000);
        };

        /**
         * 停止计时器 - 发送指令到主进程
         */
        const stopTimer = (): void => {
            if (isRunning.value) {
                isRunning.value = false;

                if (ipcRenderer) {
                    // 向主进程发送暂停计时指令
                    ipcRenderer.send('pause-timer');
                    console.log('[Renderer] Pausing timer in main process');
                } else if (legacyTimer) {
                    // 如果在非Electron环境，清除老计时器
                    clearInterval(legacyTimer);
                    legacyTimer = null;
                }
            }
        };

        /**
         * 切换计时器状态（开始/暂停）
         */
        const toggleTimer = (): void => {
            isRunning.value ? stopTimer() : startTimer();
        };

        /**
         * 重置计时器 - 发送指令到主进程
         */
        const resetTimer = (): void => {
            stopTimer();
            isBreak.value = false;
            time.value = workTime.value * 60;

            if (ipcRenderer) {
                // 向主进程发送重置计时器指令
                ipcRenderer.send('reset-timer', {
                    time: workTime.value * 60,
                    isBreak: false
                });
                console.log('[Renderer] Resetting timer in main process');
            }
        };

        /**
         * 播放提示音
         */
        const playAlertSound = (): void => {
            if (alertSound.value && soundEnabled.value) {
                console.log('尝试播放提示音...');

                // 重置音频到开始位置
                alertSound.value.currentTime = 0;

                // 播放音频
                const playPromise = alertSound.value.play();

                // 处理播放过程中可能的错误
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log('提示音播放成功!');
                        })
                        .catch(err => {
                            console.error('提示音播放失败:', err);
                        });
                }
            } else {
                console.log('提示音未初始化或已禁用');
            }
        };

        /**
         * 停止提示音
         */
        const stopAlertSound = (): void => {
            if (alertSound.value) {
                alertSound.value.pause();
                alertSound.value.currentTime = 0;
            }
        };

        /**
         * 测试播放提示音
         * 用户可以通过此功能手动触发声音，解决自动播放限制
         */
        const testSound = (): void => {
            playAlertSound();
        };

        /**
         * 切换声音开关
         */
        const toggleSound = (): void => {
            soundEnabled.value = !soundEnabled.value;
        };

        /**
         * 处理计时完成事件
         */
        const handleTimerComplete = (): void => {
            stopTimer();

            // 播放提示音
            playAlertSound();

            if (!isBreak.value) {
                // 工作结束，开始休息
                time.value = breakTime.value * 60;
                isBreak.value = true;
                notifyUser('工作时间结束，开始休息！');
            } else {
                // 休息结束，开始工作
                time.value = workTime.value * 60;
                isBreak.value = false;
                notifyUser('休息时间结束，开始工作！');
            }
        };

        /**
         * 发送系统通知
         * @param message 通知消息内容
         */
        const notifyUser = (message: string): void => {
            // 如果已有通知，先关闭
            if (currentNotification.value) {
                currentNotification.value.close();
                currentNotification.value = null;
            }

            if (Notification.permission === 'granted') {
                // 创建新通知
                const notification = new Notification('番茄钟提醒', {
                    body: message,
                    // 通知不会自动关闭
                    requireInteraction: true
                });

                // 保存通知引用
                currentNotification.value = notification;

                // 处理通知关闭事件 - 强制使用直接函数定义，避免this指向问题
                notification.onclose = function () {
                    console.log('通知关闭，停止声音');
                    stopAlertSound();
                    if (currentNotification.value === notification) {
                        currentNotification.value = null;
                    }
                };

                notification.onclick = function () {
                    console.log('通知关闭，停止声音');
                    stopAlertSound();
                    if (currentNotification.value === notification) {
                        currentNotification.value = null;
                    }
                };

                // 设置通知自动关闭（30秒后）
                setTimeout(() => {
                    if (notification && currentNotification.value === notification) {
                        notification.close();
                    }
                }, 30000); // 30秒后自动关闭

            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        notifyUser(message); // 重新尝试发送通知
                    }
                });
            }
        };

        /**
         * 更新工作时间设置
         * @param value 新的工作时间(分钟)
         */
        const updateWorkTime = (value: number): void => {
            const newValue = Math.min(Math.max(1, value), 60);
            workTime.value = newValue;
            if (!isRunning.value && !isBreak.value) {
                time.value = newValue * 60;
            }
        };

        /**
         * 更新休息时间设置
         * @param value 新的休息时间(分钟)
         */
        const updateBreakTime = (value: number): void => {
            const newValue = Math.min(Math.max(1, value), 30);
            breakTime.value = newValue;
            if (!isRunning.value && isBreak.value) {
                time.value = newValue * 60;
            }
        };

        // 组件挂载时设置
        onMounted(() => {
            console.log('组件挂载中...');

            // 请求通知权限
            if (Notification.permission !== 'granted') {
                Notification.requestPermission();
            }

            // 初始化提示音频
            try {
                console.log('初始化音频，路径:', alertSoundPath);
                alertSound.value = new Audio(alertSoundPath);

                // 设置音频循环播放
                alertSound.value.loop = true;

                // 监听音频加载状态
                alertSound.value.addEventListener('canplaythrough', () => {
                    console.log('音频加载完成，可以播放');
                });

                alertSound.value.addEventListener('error', (e) => {
                    console.error('音频加载失败:', e);
                });

                // 预加载音频
                alertSound.value.load();
            } catch (err) {
                console.error('初始化音频失败:', err);
            }

            // 设置从主进程接收计时器更新的监听器
            if (ipcRenderer) {
                console.log('[Renderer] Setting up IPC event listeners');

                // 接收时间更新
                ipcRenderer.on('timer-update', (_: any, data: { remaining: number; isRunning: boolean; }) => {
                    time.value = data.remaining;
                    isRunning.value = data.isRunning;
                });

                // 接收计时完成事件
                ipcRenderer.on('timer-complete', () => {
                    handleTimerComplete();
                });

                // 获取初始计时器状态
                ipcRenderer.send('get-timer-state');
            }
        });

        // 组件卸载时清理
        onUnmounted(() => {
            // 如果在非Electron环境，清除老计时器
            if (legacyTimer) {
                clearInterval(legacyTimer);
                legacyTimer = null;
            }

            // 关闭任何活动的通知
            if (currentNotification.value) {
                currentNotification.value.close();
                currentNotification.value = null;
            }

            // 停止任何正在播放的声音
            stopAlertSound();

            // 移除IPC事件监听器
            if (ipcRenderer) {
                ipcRenderer.removeAllListeners('timer-update');
                ipcRenderer.removeAllListeners('timer-complete');
            }
        });

        // 渲染模板
        return () => (
            <div class={styles.container}>
                <div class={styles.clockContainer}>
                    <div
                        class={[
                            styles.timer,
                            isBreak.value && styles.break,
                            isRunning.value && styles.running
                        ]}
                    >
                        <h1 class={styles.timerDisplay}>{formatTime(time.value)}</h1>
                        <div class={styles.status}>
                            {isBreak.value ? '休息时间' : '工作时间'}
                        </div>
                    </div>

                    <div class={styles.controls}>
                        <button
                            onClick={toggleTimer}
                            class={styles.button}
                        >
                            {isRunning.value ? '暂停' : '开始'}
                        </button>
                        <button
                            onClick={resetTimer}
                            class={styles.button}
                        >
                            重置
                        </button>
                    </div>

                    <div class={styles.settingItem}>
                        <label>工作时间 (分钟):</label>
                        <input
                            type="number"
                            min="1"
                            max="60"
                            value={workTime.value}
                            class={styles.input}
                            onInput={(e: Event) => {
                                const target = e.target as HTMLInputElement
                                updateWorkTime(Number(target.value))
                            }}
                        />
                    </div>
                    <div class={styles.settingItem}>
                        <label>休息时间 (分钟):</label>
                        <input
                            type="number"
                            min="1"
                            max="30"
                            value={breakTime.value}
                            class={styles.input}
                            onInput={(e: Event) => {
                                const target = e.target as HTMLInputElement
                                updateBreakTime(Number(target.value))
                            }}
                        />
                    </div>

                    {/* 声音设置 */}
                    <div class={styles.settingItem}>
                        <label>
                            <input
                                type="checkbox"
                                checked={soundEnabled.value}
                                onChange={toggleSound}
                            />
                            启用声音提醒
                        </label>
                        {/* <button
                            onClick={testSound}
                            class={styles.button}
                            style={{ marginLeft: '10px', fontSize: '0.8em' }}
                        >
                            测试声音
                        </button> */}


                    </div>

                    <div class={styles.settingItem}>
                        <button
                            onClick={() => {
                                time.value = 1;
                            }}
                            class={styles.button}
                            style={{ marginLeft: '10px', fontSize: '0.8em' }}
                        >
                            修改时间
                        </button>


                    </div>
                </div>
            </div>
        )
    }
})