<script setup lang="ts">
import { defineProps } from 'vue'
import { type DirectoryNode } from '../types'
import { useTabsStore } from '../store/Files'
const tabsStore = useTabsStore()
// const editorStore = useeditorStore()

defineProps<{
  node: DirectoryNode
}>()
function handleNodeClick(node: DirectoryNode): void {
  // console.log('节点被点击:', node.name)
  node.expanded = !node.expanded
  // 可在此处添加文件预览/操作逻辑
}
function handleFileClick(node: DirectoryNode): void {
  if (node.kind === 'directory') return
  window.electron.ipcRenderer.send('get-file-text', node.path)
  window.electron.ipcRenderer.once('file-text', (_, text) => {
    tabsStore.addTab(node.name, text, node.path)
  }) // 发送请求到主进程
  // console.log('节点被点击,去主进程获取数据:', node.name)
  // 可在此处添加文件预览/操作逻辑
}
</script>

<template>
  <div class="file-node" :class="{ folder: node.kind === 'directory' }">
    <!-- 文件/文件夹图标 -->
    <span v-if="node.kind === 'directory'" class="icon" @click="() => handleNodeClick(node)">
      {{ node.expanded ? '▼' : '▶' }}
    </span>
    <span v-else class="icon file-icon">📄</span>

    <!-- 节点名称 -->
    <span class="node-name" @click="() => handleFileClick(node)">
      {{ node.name }}
    </span>

    <!-- 递归渲染子节点 -->
    <div v-if="node.expanded && node.children" class="children">
      <FileTree v-for="child in node.children" :key="child.name" :node="child" />
    </div>
  </div>
</template>

<style scoped>
.file-node {
  cursor: pointer;
  padding: 4px 0;
  display: block;
  align-items: center;
}

.icon {
  cursor: pointer;
  margin-right: 8px;
  color: #666;
  transition: transform 0.2s;
}

.folder .icon {
  color: #007acc;
}

.file-icon {
  color: #2c3e50;
}

.children {
  padding-left: 20px;
}

/* 展开动画 */
.file-node.folder:hover .icon {
  transform: rotate(90deg);
}
</style>
