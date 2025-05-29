import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 自定义渲染进程使用的API集合
const api = {}

// 检查是否启用上下文隔离，决定如何暴露Electron和自定义API到渲染进程
if (process.contextIsolated) {
  try {
    // 通过contextBridge将Electron API和自定义API暴露到主窗口全局对象
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    // 捕获并记录暴露API过程中发生的错误
    console.error(error)
  }
} else {
  // 未启用上下文隔离时直接挂载到全局window对象（@ts-ignore用于忽略类型检查，类型定义在dts文件中）
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
