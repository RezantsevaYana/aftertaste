import { createApp } from 'vue'
import { pinia } from '@/stores'
import App from './App.vue'
import '@vuepic/vue-datepicker/dist/main.css'
import 'lightgallery/css/lightgallery.css'
import 'lightgallery/css/lg-zoom.css'
import 'lightgallery/css/lg-thumbnail.css'
import '@/styles/main.scss'

const app = createApp(App)

app.use(pinia)
app.mount('#app')
