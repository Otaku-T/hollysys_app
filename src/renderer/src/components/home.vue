<script setup lang="ts">
import { useRouter } from 'vue-router'
import FileTree from './FileTree.vue'
import PDF from './PDF.vue'
import { useFilesStore } from '../store/Files'
const filesStore = useFilesStore()
const router = useRouter()

// 打开文件
function open_file(): void {
  window.electron.ipcRenderer.send('open-files-dialog') // 发送请求到主进程
}
// 创建工程
function create_hollysys(): void {
  window.electron.ipcRenderer.send('create_hollysys')
}
// 功能测试按钮
function test_sw(): void {
  window.electron.ipcRenderer.send('test_sw')
}
// 路由跳转
function login_zhaobiao(): void {
  router.push('/zhaobiao')
}
function login_sheji(): void {
  router.push('/sheji')
}
function login_zutai(): void {
  router.push('/zutai')
}
function login_tool(): void {
  router.push('/tool')
}
</script>
<template>
  <span class="navigate">
    <!-- 欢迎容器在左侧 -->
    <div class="welcome-container">
      <img src="../assets/logo.png" alt="图标" class="logo-image" />
      <label class="welcome-text">欢迎使用</label>
    </div>
    <!-- 按钮组在右侧 -->
    <div class="navigate">
      <button class="red" type="button" @click="open_file">工作目录</button>
      <button class="red" type="button" @click="create_hollysys">新建工程</button>
      <button class="red" type="button" @click="login_zhaobiao">招标</button>
      <button class="red" type="button" @click="login_sheji">设计</button>
      <button class="red" type="button" @click="login_zutai">组态</button>
      <button class="red" type="button" @click="login_tool">工具</button>
      <button class="red" type="button" @click="test_sw">测试</button>
    </div>
  </span>
  <!-- 新增分割线 -->
  <hr class="page-divider" />
  <div class="textarea-container">
    <div class="left-panel">
      <!-- 文件目录树组件 -->
      <FileTree
        v-if="filesStore.files_tree_data.length > 0"
        :node="filesStore.files_tree_data[0]"
      />
    </div>
    <!-- <div class="right-panel"> -->
    <PDF />
    <!-- <code-editor></code-editor> -->
    <!-- <textarea class="resizable-textarea" readonly></textarea> -->
    <!-- </div> -->
  </div>
</template>
<style scoped>
.welcome-container {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-right: 20px;
}

.welcome-text {
  font-size: 28px;
  font-weight: bold;
}

.logo-image {
  width: 64px;
  height: 64px;
}

.navigate {
  display: flex;
  justify-content: space-between;
  margin: 20 100px;
  gap: 40px;
}
</style>
