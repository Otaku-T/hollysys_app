<script setup lang="ts">
import { useRouter } from 'vue-router'
import FileTree from './FileTree.vue'
import Tabs from './Tabs.vue'
import { useFilesStore } from '../store/Files'

const filesStore = useFilesStore()
const router = useRouter()
//路由跳转
function login_home(): void {
  router.push('/home')
}
// 数据分类
function hollysysDATA(): void {
  window.electron.ipcRenderer.send('hollysysDATA')
}
// 更新表格
function hollysysExcel(): void {
  window.electron.ipcRenderer.send('hollysysExcel')
}
// 生成回路
function hollysysPID(): void {
  window.electron.ipcRenderer.send('hollysysPID')
}
// 替换POU
function hollysysPOU(): void {
  window.electron.ipcRenderer.send('hollysysPOU')
}
// POU变量表
function hollysysPOUExcel(): void {
  window.electron.ipcRenderer.send('hollysysPOUExcel')
}
// 生成ST
function hollysysST(): void {
  window.electron.ipcRenderer.send('hollysysST')
}
// 替换ST
function hollysysSTPOU(): void {
  window.electron.ipcRenderer.send('hollysysSTPOU')
}
// ST变量表
function hollysysSTExcel(): void {
  window.electron.ipcRenderer.send('hollysysSTExcel')
}
// 备份excel文件
function hollysysBF(): void {
  window.electron.ipcRenderer.send('hollysysBF')
}
</script>
<template>
  <span class="navigate">
    <!-- 按钮组在右侧 -->
    <button class="red" type="button" @click="login_home">主页</button>
    <button class="red" type="button" @click="hollysysDATA">数据分类</button>
    <button class="red" type="button" @click="hollysysExcel">更新表格</button>
    <button class="red" type="button" @click="hollysysPID">生成回路</button>
    <button class="red" type="button" @click="hollysysPOU">替换POU</button>
    <button class="red" type="button" @click="hollysysPOUExcel">POU变量表</button>
    <button class="red" type="button" @click="hollysysST">生成ST</button>
    <button class="red" type="button" @click="hollysysSTExcel">ST变量表</button>
    <button class="red" type="button" @click="hollysysSTPOU">替换ST</button>
    <button class="red" type="button">修改画面</button>
    <button class="red" type="button">生成画面</button>
    <button class="red" type="button" @click="hollysysBF">备份</button>
  </span>
  <!-- 新增分割线 -->
  <hr class="page-divider" />
  <div class="textarea-container">
    <div class="left-panel">
      <!-- 文件目录树组件 -->
      <FileTree
        v-if="filesStore.files_tree_data.length > 0"
        :node="filesStore.files_tree_data[0].children?.[2] || filesStore.files_tree_data[0]"
      />
    </div>
    <div class="right-panel">
      <Tabs />
      <!-- <textarea class="resizable-textarea" readonly></textarea> -->
    </div>
  </div>
</template>
