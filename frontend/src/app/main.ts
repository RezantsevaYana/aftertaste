import { createApp } from 'vue'
import { pinia } from '@/stores'
import App from './App.vue'
import '@/styles/main.scss'

const app = createApp(App)

app.use(pinia)
app.mount('#app')
