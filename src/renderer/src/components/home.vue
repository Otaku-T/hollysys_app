<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'
import helpMd from '../assets/help.md?raw' // 根据实际路径调整
import FileTree from './FileTree.vue'
import { useFilesStore } from '../store/Files'
const filesStore = useFilesStore()

const markdownContent = ref('')
const router = useRouter()

// 加载Markdown文件内容
const loadMarkdown = async (): Promise<void> => {
  // console.log('加载文件')
  markdownContent.value = helpMd
  // console.log(markdownContent.value)
}
// 组件挂载时加载文件
onMounted(() => {
  loadMarkdown()
})

// 打开文件
function open_file(): void {
  window.electron.ipcRenderer.send('open-files-dialog') // 发送请求到主进程
}
// 创建工程
function create_hollysys(): void {
  window.electron.ipcRenderer.send('create_hollysys')
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
    <div class="right-panel">
      <!-- <code-editor></code-editor> -->
      <textarea class="resizable-textarea" readonly :value="markdownContent"></textarea>
    </div>
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
