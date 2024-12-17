import './assets/main.css'
import ElementPlus from 'element-plus'
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App'
import router from './router'

const app = createApp(App).use(ElementPlus)

app.use(createPinia())
app.use(router)

app.mount('#app')
