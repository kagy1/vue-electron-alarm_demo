import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import styles from './TomatoClock.module.scss'

export default defineComponent({
    setup(_, { expose }) {
        // 状态定义
        const time: Ref<number> = ref(25 * 60)           // 当前剩余时间(秒)
        const isRunning: Ref<boolean> = ref(false)       // 计时器运行状态
        const isBreak: Ref<boolean> = ref(false)         // 是否处于休息时间
        const timer: Ref<number | null> = ref(null)      // 计时器引用
        const workTime: Ref<number> = ref(25)            // 工作时间(分钟)
        const breakTime: Ref<number> = ref(5)            // 休息时间(分钟)

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
         * 开始计时器
         */
        const startTimer = (): void => {
            if (!isRunning.value) {
                isRunning.value = true
                timer.value = window.setInterval(() => {
                    if (time.value > 0) {
                        time.value--
                    } else {
                        handleTimerComplete()
                    }
                }, 1000)
            }
        }

        /**
         * 停止计时器
         */
        const stopTimer = (): void => {
            if (timer.value) {
                clearInterval(timer.value)
                timer.value = null
                isRunning.value = false
            }
        }

        /**
         * 切换计时器状态（开始/暂停）
         */
        const toggleTimer = (): void => {
            isRunning.value ? stopTimer() : startTimer()
        }

        /**
         * 重置计时器
         */
        const resetTimer = (): void => {
            stopTimer()
            time.value = workTime.value * 60
            isBreak.value = false
        }

        /**
         * 处理计时完成事件
         */
        const handleTimerComplete = (): void => {
            if (!isBreak.value) {
                time.value = breakTime.value * 60
                isBreak.value = true
                notifyUser('工作时间结束，开始休息！')
            } else {
                time.value = workTime.value * 60
                isBreak.value = false
                notifyUser('休息时间结束，开始工作！')
            }
            stopTimer()
        }

        /**
         * 发送系统通知
         * @param message 通知消息内容
         */
        const notifyUser = (message: string): void => {
            if (Notification.permission === 'granted') {
                new Notification('番茄钟提醒', { body: message })
            }
        }

        /**
         * 更新工作时间设置
         * @param value 新的工作时间(分钟)
         */
        const updateWorkTime = (value: number): void => {
            const newValue = Math.min(Math.max(1, value), 60)
            workTime.value = newValue
            if (!isRunning.value && !isBreak.value) {
                time.value = newValue * 60
            }
        }

        /**
         * 更新休息时间设置
         * @param value 新的休息时间(分钟)
         */
        const updateBreakTime = (value: number): void => {
            const newValue = Math.min(Math.max(1, value), 30)
            breakTime.value = newValue
            if (!isRunning.value && isBreak.value) {
                time.value = newValue * 60
            }
        }

        // 组件挂载时，请求通知权限
        onMounted(() => {
            if (Notification.permission !== 'granted') {
                Notification.requestPermission()
            }
        })

        // 组件卸载时，清除计时器
        onUnmounted(() => {
            if (timer.value) {
                clearInterval(timer.value)
            }
        })

        // 暴露方法给父组件
        expose({
            startTimer,
            stopTimer,
            resetTimer
        })

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

                    <div class={styles.settings}>
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
                    </div>
                </div>
            </div>
        )
    }
})