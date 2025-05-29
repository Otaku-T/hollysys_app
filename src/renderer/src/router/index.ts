import { createRouter, createWebHashHistory } from 'vue-router'
// 引入一个一个可能要呈现组件
import signup from '../components/SignUp.vue'
import home from '../components/home.vue'
import sheji from '../components/sheji.vue'
import zhaobiao from '../components/zhaobiao.vue'
import zutai from '../components/zutai.vue'
import tool from '../components/tool.vue'
// 第二步：创建路由器
const router = createRouter({
  history: createWebHashHistory(), //路由器的工作模式（稍后讲解）
  routes: [
    //一个一个的路由规则
    {
      path: '/signup',
      component: signup
    },
    {
      path: '/home',
      component: home
    },
    {
      path: '/sheji',
      component: sheji
    },
    {
      path: '/zhaobiao',
      component: zhaobiao
    },
    {
      path: '/zutai',
      component: zutai
    },
    {
      path: '/tool',
      component: tool
    },
    {
      path: '/',
      redirect: '/signup'
    }
  ]
})
// 暴露出去router
export default router
