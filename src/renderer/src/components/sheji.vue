<script setup lang="ts">
import { useRouter } from 'vue-router'
import FileTree from './FileTree.vue'
import Tabs from './Tabs.vue'
import { useFilesStore } from '../store/Files'

const filesStore = useFilesStore()
const router = useRouter()
function login_home(): void {
  router.push('/home')
}
</script>
<template>
  <span class="navigate">
    <!-- 按钮组在右侧 -->
    <button class="red" type="button" @click="login_home">主页</button>
    <button class="red" type="button">IO输出</button>
    <button class="red" type="button">网络结构</button>
    <button class="red" type="button">FAT报告</button>
    <button class="red" type="button">联调报告</button>
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
      <Tabs />
      <!-- <textarea class="resizable-textarea" readonly></textarea> -->
    </div>
  </div>
</template>
