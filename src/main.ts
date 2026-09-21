import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import { initSqlEngine } from './utils/sqljs-engine'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

initSqlEngine()
  .catch((err) => {
    console.error('[JSFND] SQLite 引擎初始化失败', err)
  })
  .finally(() => {
    app.mount('#app')
  })
