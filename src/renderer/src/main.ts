//引入样式
import './assets/signup.scss'
//引入createApp用于创建应用
import { createApp } from 'vue'
/* 引入createPinia，用于创建pinia */
import { createPinia } from 'pinia'
// 引入App根组件
import App from './App.vue'
// 引入路由器
import router from './router'
/* 创建pinia */
const pinia = createPinia()
// 创建一个应用
const app = createApp(App)
/* 使用插件 */
app.use(pinia)
// 使用路由器
app.use(router)
// 挂载整个应用到app容器中
app.mount('#app')
