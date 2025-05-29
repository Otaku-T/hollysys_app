<script setup lang="ts">
import { useTabsStore } from '../store/Files'
import * as monaco from 'monaco-editor'
import { onMounted, ref } from 'vue'
const tabsStore = useTabsStore()
// 注册自定义语言
monaco.languages.register({ id: 'st' })

// 定义语法规则
monaco.languages.setMonarchTokensProvider('st', {
  tokenizer: {
    root: [
      [/(\(\*.*?\*\))/, 'comment'], // 单行注释高亮，修改为 (* ... *) 形式
      // 检测多行注释开始符号
      [/\(\*/, 'comment', '@comment'], // 进入注释状态
      [
        /\b(IF|THEN|ELSE|ELSIF|CASE|OF|END_IF|END_CASE|FOR|TO|BY|DO|END_FOR|WHILE|END_WHILE|REPEAT|UNTIL|END_REPEAT|EXIT)\b/,
        'keyword'
      ],
      [/\b\d+\.?\d*([eE][+-]?\d+)?\b|0x[\da-fA-F]+|FALSE|TRUE/, 'number'], // 数字高亮
      [/(:=|!=|<=|>=|&&|\|\||<<|>>|EXPT|MOD|AND|XOR|OR|NOT)/, 'operator'], // 优先匹配长操作符（多字符运算符）
      [/[+\-*/%=<>&|^~]/, 'operator'], // 单字符运算符（使用字符类简化）
      // 变量匹配规则（支持带点号的成员访问）
      [
        /\b(\w\w*)(?:\.([a-zA-Z_]\w*))+\b/,
        'variable' // 匹配带点号的复合变量
      ],
      [
        /\b(\w\w*)+\b/,
        'variable' // 匹配带点号的复合变量
      ]
    ],
    // 注释状态处理
    comment: [
      // 检测多行注释结束符号
      [/\*\)/, 'comment', '@pop'], // 结束注释，返回 root 状态
      [/./, 'comment'] // 注释内容匹配任意字符
    ]
  }
})
monaco.editor.defineTheme('myTheme', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'number', foreground: 'aa5500' }, // 红色
    { token: 'operator', foreground: 'ff5500' }, // 红色
    { token: 'variable', foreground: 'C588CC' } // 红色
  ],
  colors: {} // 新增空colors字段
})
// 初始化 Monaco Editor
const editorRef = ref(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null
onMounted(() => {
  if (!editorRef.value) return
  editor = monaco.editor.create(editorRef.value, {
    value: tabsStore.files_tabs_data.editItem[tabsStore.files_tabs_data.id],
    language: 'st', // 根据需要设置语言
    theme: 'myTheme', // 设置主题
    automaticLayout: true // 自动调整布局
  })

  // 监听编辑器内容变化
  editor.onDidChangeModelContent(() => {
    if (!editor) return
    // console.log('编辑1', tabsStore.files_tabs_data.name[tabsStore.files_tabs_data.id])
    tabsStore.setdate(
      tabsStore.files_tabs_data.name[tabsStore.files_tabs_data.id],
      editor.getValue()
    )
    // console.log('内容', editor.getValue())
    // console.log('保存2', tabsStore.files_tabs_data.save[tabsStore.files_tabs_data.id])
    // // console.log('打印1', tabsStore.files_tabs_data.text[tabsStore.files_tabs_data.id])
    // console.log('打印2', tabsStore.files_tabs_data.editItem[tabsStore.files_tabs_data.id])
  })
})

function editItem(name: string): void {
  tabsStore.seltab(name)
  if (!editor) return
  editor.setValue(tabsStore.files_tabs_data.editItem[tabsStore.files_tabs_data.id])
}
function delItem(name: string): void {
  // console.log('删除', name)
  tabsStore.delete(name)
  if (!editor) return
  editor.setValue(tabsStore.files_tabs_data.editItem[tabsStore.files_tabs_data.id])
}
function saveItem(): void {
  tabsStore.savedate()
  const path = tabsStore.files_tabs_data.path[tabsStore.files_tabs_data.id]
  const text = tabsStore.files_tabs_data.editItem[tabsStore.files_tabs_data.id]
  // console.log('路径', path)
  window.electron.ipcRenderer.send('save-file-data', path, text)
}
</script>

<template>
  <div class="tab-container">
    <div v-for="(item, index) in tabsStore.files_tabs_data.name" :key="index" class="tab-item">
      <input :id="item" type="radio" checked name="tab" />
      <label
        :for="item"
        class="tab-item-left"
        :style="{ color: tabsStore.files_tabs_data.save[index] ? 'blue' : 'red' }"
        @click="editItem(item)"
        >{{ item }}</label
      >
      <label class="tab-item-right" @click="delItem(item)">X</label>
    </div>
    <button class="tab-item" @click="saveItem">保存</button>
  </div>
  <div ref="editorRef" class="vscode-editor"></div>
</template>

<style scoped>
.tab-container {
  display: flex;
  overflow-x: auto; /* 启用横向滚动 */
  white-space: nowrap; /* 防止子元素换行 */
  justify-content: flex-start; /* 内容靠右对齐 */
  max-width: 1590px;
  input {
    display: none;
  }
}
/* 新增选中状态样式 */
input[type='radio']:checked + .tab-item-left {
  background-color: #ccccbb; /* 选中背景色 */
  border-radius: 4px; /* 可选：圆角边框 */
  border-color: #337788; /* 边框颜色 */
}

.tab-item {
  flex-shrink: 0; /* 禁止压缩，保证可滚动  */
  color: rgb(6, 29, 134);
  white-space: nowrap; /* 防止子元素换行 */
  /* 限制大小 */
  font-size: 12px; /* 设置你想要的字体大小 */
  padding: 6px 4px; /* 上F6px，左右4px*/
  max-width: 110px;
  border: 1px solid #337788; /* 默认灰色边框 */
  border-radius: 4px; /* 可选：圆角边框 */
  overflow: hidden; /* 超出部分隐藏 */
  text-overflow: ellipsis; /* 文字超出显示省略号 */
  margin: 0; /* 避免默认 margin 导致的空隙 */
  display: flex; /* 启用 Flex 布局 */
  justify-content: space-between; /* 左右对齐 */
  align-items: center; /* 垂直居中 */
}
.tab-item:active {
  background-color: #ccccbb;
}
.tab-item-left {
  white-space: nowrap; /* 防止子元素换行 */
  /* 限制大小 */
  min-width: 100px;
  flex: 1; /* 可选：让左侧占更多空间 */
  overflow: hidden; /* 超出部分隐藏 */
  text-overflow: ellipsis; /* 文字超出显示省略号 */
  white-space: nowrap; /* 防止换行 */
  margin: 0; /* 避免默认 margin 导致的空隙 */
}
.tab-item-right {
  white-space: nowrap; /* 防止子元素换行 */
  /* 限制大小 */
  justify-content: flex-end; /* 内容靠右对齐 */
  text-overflow: ellipsis; /* 文字超出显示省略号 */
  margin-left: 5px;
  color: #ae1100; /* 删除按钮文字颜色可自定义 */
  margin: 0; /* 避免默认 margin 导致的空隙 */
}
.default-bg {
  background-color: #bdc3c7; /* 默认浅灰色背景 */
}

.alternate-bg {
  background-color: #3498db; /* 替换为浅蓝色背景 */
}
</style>
