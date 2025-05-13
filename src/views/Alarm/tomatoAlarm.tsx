import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import styles from './TomatoClock.module.scss'

// 任务类型接口定义
interface Task {
    id: number        // 任务唯一标识
    content: string   // 任务内容
    completed: boolean // 任务完成状态
}

export default defineComponent({
    setup(_, { expose }) {
        // 状态定义
        const time: Ref<number> = ref(25 * 60)           // 当前剩余时间(秒)
        const isRunning: Ref<boolean> = ref(false)       // 计时器运行状态
        const isBreak: Ref<boolean> = ref(false)         // 是否处于休息时间
        const tasks: Ref<Task[]> = ref([])               // 任务列表
        const newTask: Ref<string> = ref('')             // 新任务输入框内容
        const timer: Ref<number | null> = ref(null)      // 计时器引用
        const taskIdCounter: Ref<number> = ref(0)        // 任务ID计数器
        const workTime: Ref<number> = ref(25)            // 工作时间(分钟)
        const breakTime: Ref<number> = ref(5)            // 休息时间(分钟)

        /**
         * 格式化时间显示
         * @param seconds 秒数
         * @returns 格式化后的时间字符串 (MM:SS)
         */
        const formatTime = (seconds: number): string => {
            const mins = Math.floor(seconds / 60)
            const secs = seconds % 60
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
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
                // 工作时间结束，进入休息时间 
                time.value = breakTime.value * 60
                isBreak.value = true
                notifyUser('工作时间结束，开始休息！')
            } else {
                // 休息时间结束，进入工作时间
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
         * 添加新任务
         */
        const addTask = (): void => {
            const content = newTask.value.trim()
            if (content) {
                tasks.value.push({
                    id: ++taskIdCounter.value,
                    content,
                    completed: false
                })
                newTask.value = ''
            }
        }

        /**
         * 删除指定任务
         * @param id 任务ID
         */
        const removeTask = (id: number): void => {
            const index = tasks.value.findIndex(task => task.id === id)
            if (index !== -1) {
                tasks.value.splice(index, 1)
            }
        }

        /**
         * 切换任务完成状态
         * @param id 任务ID
         */
        const toggleTaskStatus = (id: number): void => {
            const task = tasks.value.find(task => task.id === id)
            if (task) {
                task.completed = !task.completed
            }
        }

        /**
         * 更新工作时间设置
         * @param value 新的工作时间(分钟)
         */
        const updateWorkTime = (value: number): void => {
            const newValue = Math.min(Math.max(1, value), 60) // 限制在1-60分钟之间
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
            const newValue = Math.min(Math.max(1, value), 30) // 限制在1-30分钟之间
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
                {/* 时钟容器 */}
                <div class={styles.clockContainer}>
                    {/* 计时器显示 */}
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

                    {/* 控制按钮 */}
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

                    {/* 时间设置 */}
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

                {/* 任务列表容器 */}
                <div class={styles.taskContainer}>
                    <h2 class={styles.taskHeader}>任务列表</h2>
                    {/* 任务输入框 */}
                    <div class={styles.taskInput}>
                        <input
                            type="text"
                            value={newTask.value}
                            class={styles.taskInputField}
                            onInput={(e: Event) => {
                                const target = e.target as HTMLInputElement
                                newTask.value = target.value
                            }}
                            onKeyup={(e: KeyboardEvent) => {
                                if (e.key === 'Enter') {
                                    addTask()
                                }
                            }}
                            placeholder="添加新任务..."
                        />
                        <button
                            onClick={addTask}
                            class={styles.button}
                        >
                            添加
                        </button>
                    </div>

                    {/* 任务列表 */}
                    <ul class={styles.taskList}>
                        {tasks.value.map(task => (
                            <li
                                key={task.id}
                                class={[
                                    styles.taskItem,
                                    task.completed && styles.completed
                                ]}
                            >
                                <label class={styles.taskLabel}>
                                    <input
                                        type="checkbox"
                                        checked={task.completed}
                                        class={styles.checkbox}
                                        onChange={() => toggleTaskStatus(task.id)}
                                    />
                                    <span class={styles.taskContent}>{task.content}</span>
                                </label>
                                <button
                                    onClick={() => removeTask(task.id)}
                                    class={styles.deleteButton}
                                >
                                    删除
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        )
    }
})