import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../renderer/src/assets/logo.png?asset'
import {
  test_sw,
  open_files_dialog,
  DirectoryNode,
  create_hollysys,
  hollysysDATA,
  hollysysExcel,
  hollysysPID,
  hollysysRWexcel,
  hollysysPOU,
  hollysysPOUExcel,
  hollysysST,
  hollysysSTPOU,
  hollysysSTExcel,
  hollysysBF,
  get_file_text,
  save_file_data
} from './ipcfunction' // 引入新文件
import {
  ops_tool,
  excel_merge,
  excel_split,
  hollysysPOU6,
  hollysysIOdata,
  hollysysIOjxb,
  get_file_pdf
} from './tool' // 引入新文件
// 在入口文件中统一声明全局变量
declare global {
  interface Window {
    globalpaths: string[]
    globalDirectoryTree: DirectoryNode[]
    mainWindow: BrowserWindow | null // 新增窗口引用
  }
}
global.mainWindow = null // 初始化为空
// // 使用 defineProperty 监听变量变化
Object.defineProperty(global, 'globalDirectoryTree', {
  configurable: true,
  enumerable: true,
  get(): DirectoryNode[] {
    return global._globalDirectoryTree || []
  },
  set(newValue: DirectoryNode[]) {
    global._globalDirectoryTree = newValue
    // console.log('globalDirectoryTree 变更:', newValue)
    // 新增：发送到渲染进程
    if (global.mainWindow) {
      global.mainWindow.webContents.send('files-tree-updated', newValue)
    }
  }
})

// 在main.ts中启用实验性API
app.commandLine.appendSwitch('enable-experimental-web-platform-features')
app.commandLine.appendSwitch('enable-automation')
/**
 * 创建主浏览器窗口并配置相关属性
 */
function createWindow(): void {
  // 创建浏览器窗口实例并配置基础属性
  global.mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
    autoHideMenuBar: true,
    icon: icon, // 使用已导入的图标变量
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // 当窗口准备就绪时显示窗口
  global.mainWindow.on('ready-to-show', () => {
    global.mainWindow.show()
  })

  // 处理新窗口打开请求，使用系统浏览器打开外部链接
  global.mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 开发环境加载远程URL，生产环境加载本地HTML文件
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    global.mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    global.mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
// IPC通信接口合集
function setupIpc(): void {
  // 调用组态IPC通信函数
  ipcMain.on('test_sw', test_sw)
  ipcMain.on('open-files-dialog', open_files_dialog)
  ipcMain.on('create_hollysys', create_hollysys)
  ipcMain.on('hollysysDATA', hollysysDATA)
  ipcMain.on('hollysysExcel', hollysysExcel)
  ipcMain.on('hollysysPID', hollysysPID)
  ipcMain.on('hollysysRWexcel', hollysysRWexcel)
  ipcMain.on('hollysysPOU', hollysysPOU)
  ipcMain.on('hollysysPOUExcel', hollysysPOUExcel)
  ipcMain.on('hollysysST', hollysysST)
  ipcMain.on('hollysysSTPOU', hollysysSTPOU)
  ipcMain.on('hollysysSTExcel', hollysysSTExcel)
  ipcMain.on('hollysysBF', hollysysBF)
  ipcMain.on('get-file-text', async (_, path) => {
    get_file_text(path)
  })
  ipcMain.on('save-file-data', async (_, path, text) => {
    save_file_data(path, text)
  })
  // 调用工具IPC通信函数
  ipcMain.on('ops_tool', async (_, loopCount, intervalTime, xCoordinate, yCoordinate) => {
    ops_tool(loopCount, intervalTime, xCoordinate, yCoordinate)
  })
  ipcMain.on('excel_merge', async (_, excel_mRow, excel_mindex) => {
    excel_merge(excel_mRow, excel_mindex)
  })
  ipcMain.on('excel_split', async (_, excel_sRow) => {
    excel_split(excel_sRow)
  })
  ipcMain.on('hollysysPOU6', hollysysPOU6)
  ipcMain.on('hollysysIOdata', hollysysIOdata)
  ipcMain.on('hollysysIOjxb', hollysysIOjxb)
  ipcMain.on('get-file-pdf', get_file_pdf)
}
// 应用初始化完成后的配置
app.whenReady().then(async () => {
  // 创建主窗口
  createWindow()
  // 设置Windows平台的应用用户模型ID
  electronApp.setAppUserModelId('com.electron')
  // 监听浏览器窗口创建事件，处理开发工具快捷键（仅开发环境）
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 添加IPC通信接口
  setupIpc()
  // macOS激活应用时重新创建窗口
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 所有窗口关闭时的处理逻辑
app.on('window-all-closed', () => {
  // 非macOS平台直接退出应用
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
