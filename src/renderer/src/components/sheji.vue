<script setup lang="ts">
import { useRouter } from 'vue-router'
import FileTree from './FileTree.vue'
import { useFilesStore } from '../store/Files'
// import Tabs from './Tabs.vue'

const filesStore = useFilesStore()
const router = useRouter()
function login_home(): void {
  router.push('/home')
}
// 生成IO数据库
function hollysysIOdata(): void {
  window.electron.ipcRenderer.send('hollysysIOdata')
}
// 生成IO接线表
function hollysysIOjxb(): void {
  window.electron.ipcRenderer.send('hollysysIOjxb')
}
</script>
<template>
  <span class="navigate">
    <!-- 按钮组在右侧 -->
    <button class="red" type="button" @click="login_home">主页</button>
    <button class="red" type="button" @click="hollysysIOdata">数据库</button>
    <button class="red" type="button" @click="hollysysIOjxb">接线表</button>
    <button class="red" type="button">FAT文件</button>
    <button class="red" type="button">机柜布置</button>
    <button class="red" type="button">联调文件</button>
  </span>
  <!-- 新增分割线 -->
  <hr class="page-divider" />
  <div class="textarea-container">
    <div class="left-panel">
      <!-- 文件目录树组件 -->
      <FileTree
        v-if="filesStore.files_tree_data.length > 0"
        :node="filesStore.files_tree_data[0].children?.[0] || filesStore.files_tree_data[0]"
      />
    </div>
    <div class="right-panel">
      <!-- <Tabs /> -->
      <div class="tool-container">
        <hr class="page-divider" />
        <div>
          <h3>其他</h3>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.tool-container {
  flex: 1; /* 占据剩余空间 */
  height: calc(100vh - 20px);
  flex-direction: column; /* 改为垂直布局 */
  gap: 12px;
  border: 1px solid #ccc; /* 添加边框 */
  border-radius: 4px; /* 圆角 */
  padding: 16px; /* 内边距 */
  /* margin: 10px 10px 10px 0; 调整外边距 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* 可选投影 */
  overflow-y: auto; /* 明确指定垂直滚动 */
}
</style>
