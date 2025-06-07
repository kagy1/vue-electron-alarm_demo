import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      name: 'tomatoAlarm',
      path: '/tomatoAlarm',
      component: () => import('@/views/Alarm/tomatoAlarm'),
      meta: {
        title: '番茄闹钟'
      }
    }],
})

export default router
