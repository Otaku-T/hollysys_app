<script setup lang="ts">
import { useFilesStore } from './store/Files'
// import Tabs from './components/Tabs.vue'
const filesStore = useFilesStore()
// window.electron.ipcRenderer.on('files-tree-updated', () => console.log('increment被调用了'))
window.electron.ipcRenderer.on('files-tree-updated', (_, date) => filesStore.updated(date)) // 发送请求到主进程
</script>

<template>
  <!-- <Tabs /> -->
  <!-- 新增目录树 -->
  <RouterView></RouterView>
  <!-- <h2>hollysys</h2> -->
</template>

<!-- <style>
/* #app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #e28c1b;
  margin-top: 60px;
  background: #e28c1b;
  background-size: 100% 100%;
} */
</style> -->
