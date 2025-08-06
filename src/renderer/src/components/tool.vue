<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref } from 'vue' // 新增ref导入

const router = useRouter()
// 新增响应式变量
const pdfUrl = ref('https://tools.pdf24.org/zh/all-tools')
const loopCount = ref(1) // 循环次数，默认1次
const intervalTime = ref(1) // 间隔时间，默认1s
const xCoordinate = ref(280) // X坐标
const yCoordinate = ref(30) // Y坐标
const excel_mRow = ref(1) // 合并表头行数，默认1次
const excel_mindex = ref(1) // 首页页数，默认1次
const excel_sRow = ref(1) // 才分表头行数，默认1次
function login_home(): void {
  router.push('/home')
}
// PDF转excel
function pdf_tool(): void {
  window.open(pdfUrl.value || 'https://tools.pdf24.org/zh/all-tools', '_blank') // 替换为你实际需要打开的URL
}
// OPS截图
function ops_tool(): void {
  window.electron.ipcRenderer.send(
    'ops_tool',
    loopCount.value,
    intervalTime.value,
    xCoordinate.value,
    yCoordinate.value
  )
}
// EXCEL合
function excel_merge(): void {
  window.electron.ipcRenderer.send('excel_merge', excel_mRow.value, excel_mindex.value)
}
// EXCEL拆
function excel_split(): void {
  window.electron.ipcRenderer.send('excel_split', excel_sRow.value)
}
// 软件更新
function checking_update(): void {
  window.open('https://github.com/Otaku-T/hollysys_app/releases', '_blank') // 替换为你实际需要打开的URL
}
</script>
<template>
  <span class="navigate">
    <!-- 按钮组在右侧 -->
    <button class="red" type="button" @click="login_home">主页</button>
    <button class="red" type="button" @click="pdf_tool">PDF处理</button>
    <button class="red" type="button" @click="excel_merge">EXCEL合</button>
    <button class="red" type="button" @click="excel_split">EXCEL拆</button>
    <button class="red" type="button" @click="ops_tool">OPS截屏</button>
    <button class="red" type="button" @click="checking_update">更新</button>
  </span>
  <!-- 新增分割线 -->
  <div class="tool-container">
    <div>
      <h3>PDF处理网址</h3>
      <input v-model="pdfUrl" class="input-box" placeholder="输入PDF处理网址" type="url" />
    </div>
    <hr class="page-divider" />
    <div>
      <h3>表格合并</h3>
      <div class="OPS-data">
        <h3>表头行数:</h3>
        <input
          v-model.number="excel_mRow"
          class="input-box"
          type="number"
          min="0"
          placeholder="表头行数"
        />
        <h3>首页页数:</h3>
        <input
          v-model.number="excel_mindex"
          class="input-box"
          type="number"
          min="0"
          placeholder="首页页数"
        />
      </div>
    </div>
    <hr class="page-divider" />
    <div>
      <h3>表格拆分</h3>
      <div class="OPS-data">
        <h3>表头行数:</h3>
        <input
          v-model.number="excel_sRow"
          class="input-box"
          type="number"
          min="1"
          placeholder="表头行数"
        />
      </div>
    </div>
    <hr class="page-divider" />
    <div>
      <h3>OPS截屏</h3>
      <div class="OPS-data">
        <h3>画面数量:</h3>
        <input
          v-model.number="loopCount"
          class="input-box"
          type="number"
          min="1"
          placeholder="画面数量"
        />
        <h3>间隔时间:</h3>
        <input
          v-model.number="intervalTime"
          class="input-box"
          type="number"
          min="0.5"
          step="0.5"
          placeholder="间隔时间（秒）"
        />
      </div>
      <div class="OPS-data">
        <h3>下页坐标:</h3>
        <input v-model.number="xCoordinate" class="input-box" type="number" placeholder="X坐标" />
        <input v-model.number="yCoordinate" class="input-box" type="number" placeholder="Y坐标" />
      </div>
    </div>
    <hr class="page-divider" />
    <div>
      <h3>其他</h3>
    </div>
  </div>
</template>
<style scoped>
.tool-container {
  flex: 1; /* 占据剩余空间 */
  height: calc(100vh - 230px);
  flex-direction: column; /* 改为垂直布局 */
  gap: 12px;
  border: 1px solid #ccc; /* 添加边框 */
  border-radius: 4px; /* 圆角 */
  padding: 16px; /* 内边距 */
  margin: 10px 10px 10px 0; /* 调整外边距 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* 可选投影 */
  overflow-y: auto; /* 明确指定垂直滚动 */
}
.OPS-data {
  /* flex-direction: row; */
  display: flex;
  align-items: center;
  gap: 20px;
  white-space: nowrap; /* 禁止标题换行 */
}
</style>
