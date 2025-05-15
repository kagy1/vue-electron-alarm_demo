import './assets/main.css'
import ElementPlus from 'element-plus'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/dist/index.css'

import App from './App'
import router from './router'

const app = createApp(App)

app.use(ElementPlus)
app.use(createPinia())
app.use(router)


// 确保路由准备好后再进行跳转
router.isReady().then(() => {
    // 如果当前在根路径，则跳转到 tomatoAlarm
    if (router.currentRoute.value.path === '/') {
        router.push('/tomatoAlarm')
    }
})

app.mount('#app')
