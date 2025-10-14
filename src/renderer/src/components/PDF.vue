<script setup lang="ts">
import PDFObject from 'pdfobject'
import { onMounted } from 'vue'

onMounted(() => {
  // 使用实际的 PDF 文件路径
  // let url = '../assets/help.pdf'
  window.electron.ipcRenderer.send('get-file-pdf')
  window.electron.ipcRenderer.once('file-pdf', (_, url) => {
    console.log('text:', url)
    // 添加错误处理
    const options = {
      fallbackLink: '<p>您的浏览器不支持PDF预览，请<a href="[url]">下载PDF文件</a></p>'
    }
    PDFObject.embed(url, '#mypdf', options)
  })
  // PDFObject.embed(url, '#mypdf', options)
})
</script>
<template>
  <div id="mypdf" class="right-panel"></div>
</template>
