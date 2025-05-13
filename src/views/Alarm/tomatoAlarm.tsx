import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import styles from './TomatoClock.module.scss'

interface Task {
    id: number
    content: string
    completed: boolean
}

export default defineComponent({
    setup(_, { expose }) {
        const time: Ref<number> = ref(25 * 60)
        const isRunning: Ref<boolean> = ref(false)
        const isBreak: Ref<boolean> = ref(false)
        const tasks: Ref<Task[]> = ref([])
        const newTask: Ref<string> = ref('')
        const timer: Ref<number | null> = ref(null)
        const taskIdCounter: Ref<number> = ref(0)
        const workTime: Ref<number> = ref(25)
        const breakTime: Ref<number> = ref(5)

        const formatTime = (seconds: number): string => {
            const mins = Math.floor(seconds / 60)
            const secs = seconds % 60
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        }

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

        const stopTimer = (): void => {
            if (timer.value) {
                clearInterval(timer.value)
                timer.value = null
                isRunning.value = false
            }
        }

        const toggleTimer = (): void => {
            isRunning.value ? stopTimer() : startTimer()
        }

        const resetTimer = (): void => {
            stopTimer()
            time.value = workTime.value * 60
            isBreak.value = false
        }

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

        const notifyUser = (message: string): void => {
            if (Notification.permission === 'granted') {
                new Notification('番茄钟提醒', { body: message })
            }
        }

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

        const removeTask = (id: number): void => {
            const index = tasks.value.findIndex(task => task.id === id)
            if (index !== -1) {
                tasks.value.splice(index, 1)
            }
        }

        const toggleTaskStatus = (id: number): void => {
            const task = tasks.value.find(task => task.id === id)
            if (task) {
                task.completed = !task.completed
            }
        }

        const updateWorkTime = (value: number): void => {
            const newValue = Math.min(Math.max(1, value), 60)
            workTime.value = newValue
            if (!isRunning.value && !isBreak.value) {
                time.value = newValue * 60
            }
        }

        const updateBreakTime = (value: number): void => {
            const newValue = Math.min(Math.max(1, value), 30)
            breakTime.value = newValue
            if (!isRunning.value && isBreak.value) {
                time.value = newValue * 60
            }
        }

        onMounted(() => {
            if (Notification.permission !== 'granted') {
                Notification.requestPermission()
            }
        })

        onUnmounted(() => {
            if (timer.value) {
                clearInterval(timer.value)
            }
        })

        expose({
            startTimer,
            stopTimer,
            resetTimer
        })

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

                <div class={styles.taskContainer}>
                    <h2 class={styles.taskHeader}>任务列表</h2>
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