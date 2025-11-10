import { dialog, shell } from 'electron'
import { join, extname } from 'path'
import * as fs from 'fs' // 新增同步方法导入
import chokidar from 'chokidar'
import * as XLSX from 'xlsx'
import { XMLParser } from 'fast-xml-parser'
import { XMLBuilder } from 'fast-xml-parser'

// 定义目录节点类型
export interface DirectoryNode {
  path: string
  name: string
  kind: 'file' | 'directory'
  children?: DirectoryNode[]
  expanded?: boolean // 新增展开状态
}
// 定义 XmlContent 类型
interface XmlContent {
  typeContent: string[] // 点类型
  idContent: string[] // idContent点ID号
  positionContent: string[] // idContent点坐标
  textContent: string[] // idContent点名
  inputidxContent: string[][] //储存OUT类型的输入ID
}
// 定义 HMIContent 类型
interface HmiContent {
  pageContent: string[] // 页面
  textContent: string[][] // 文字
  lineContent: string[][] // 直线
  groupContent: string[][] // 组合
}
// 定义 ExcelContent 类型
interface ExcelContent {
  sheetName: string[] // 储存工作表名称
  jsonData: string[][][] //储存多个工作表内容
}
// 设置解析器选项
const parserOptions = {
  ignoreAttributes: false, // 不忽略属性
  parseNodeValue: true, // 解析节点值
  parseAttributeValue: true, // 解析属性值
  attributeNamePrefix: '@_', // 属性名称前缀
  textNodeName: '#text', // 文本节点名称
  attrNodeName: '@_attr', // 属性节点名称
  cdataPropName: '#cdata', // CDATA 节点名称
  cdataPositionChar: '\\c', // CDATA 位置字符
  format: true, // 格式化输出
  trimValues: true, // 去除值的前后空格
  ignoreNameSpace: false, // 不忽略命名空间
  parseTrueNumberOnly: true, // 只解析真正的数字
  arrayMode: false, // 数组模式
  stopNodes: ['parse-me-as-string'], // 停止解析的节点
  emptyTagPlaceholder: null // 空标签占位符
}
// 设置生成参数
const builderOptions = {
  format: true, // 格式化输出
  indentBy: '    ', // 缩进字符
  newline: '\r\n', // 行尾符，设置为 CRLF
  suppressEmptyNode: false, // 不抑制空节点
  suppressBooleanAttributes: false, // 不抑制布尔属性
  writeSelfClosingTag: true, // 写自闭合标签
  cdataPropName: '#cdata', // CDATA 节点名称
  cdataPositionChar: '\\c', // CDATA 位置字符
  textNodeName: '#text', // 文本节点名称
  attrNodeName: '@_', // 属性节点名称
  ignoreAttributes: false, // 不忽略属性
  suppressRoot: true, // 抑制根节点
  declareProcIns: true, // 声明处理指令
  procInsName: 'xml', // 处理指令名称
  procInsTarget: 'xml', // 处理指令目标
  procInsAttributes: {}, // 处理指令属性
  writeBOM: false, // 不写 BOM
  encodeSpecialCharacters: true, // 编码特殊字符
  escapeValue: true, // 转义值
  escapeAttrValue: true // 转义属性值
}

// 全局变量管理监视器（在文件顶部声明）
global.chokidarWatchers = []
global.stopWatching = () => {
  global.chokidarWatchers.forEach((watcher) => watcher.close())
  global.chokidarWatchers = []
}
// 测试函数
export async function test_sw(): Promise<void> {
  try {
    await dialog.showMessageBox({
      type: 'question',
      title: '问题',
      message: '请先选择要操作的文件夹！'
    })
  } catch (error) {
    // 记录错误并重新抛出
    console.error('测试错误:', error)
    throw error
  }
}
/**
 * 打开文件对话框并返回选中的目录结构
 * @returns {Promise<DirectoryNode[]>} 选中的目录结构数组，若用户取消则返回空数组
 */
export async function open_files_dialog(): Promise<void> {
  try {
    // 显示打开目录对话框并获取用户选择的结果
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })

    // 如果用户取消选择，返回空数组
    if (result.canceled) return
    // 停止旧监视
    global.stopWatching()
    // 收集所有选中路径的目录结构
    global.globalpaths = result.filePaths
    global.globalDirectoryTree = await Promise.all(
      global.globalpaths.map((path) => processDirectory(path))
    )
    // 启动新监视
    global.globalpaths.forEach((path) => {
      const watcher = chokidar.watch(path, {
        persistent: true, // 持续监视
        ignoreInitial: true // 忽略初始化事件
      })

      // 监听文件变化事件
      watcher.on('all', async () => {
        // console.log(`Event: ${event}, Path: ${filePath}`)
        global.globalDirectoryTree = await Promise.all(
          global.globalpaths.map((path) => processDirectory(path))
        )
      })
      // 将监视器添加到全局列表
      global.chokidarWatchers.push(watcher)
    })
  } catch (error) {
    // 记录错误并重新抛出
    console.error('文件对话框错误:', error)
    throw error
  }
}
// 打开文本文件
export async function get_file_text(path: string): Promise<void> {
  const ext = extname(path)
  if (
    ext === '.st' ||
    ext === '.txt' ||
    ext === '.md' ||
    ext === '.xml' ||
    ext === '.json' ||
    ext === '.mgp7'
  ) {
    const text = await fs.promises.readFile(path, 'utf-8')
    global.mainWindow.webContents.send('file-text', text)
  } else {
    // 使用系统默认程序打开文件
    shell.openPath(path).catch((err) => {
      dialog.showMessageBox({
        type: 'error',
        title: '错误',
        message: `打开失败:${(err as Error).message}`
      })
    })
  }
  // console.log('text', text)
}
// 保存文本文件
export async function save_file_data(path: string, text: string): Promise<void> {
  try {
    const ext = extname(path)
    if (
      ext === '.st' ||
      ext === '.txt' ||
      ext === '.md' ||
      ext === '.xml' ||
      ext === '.json' ||
      ext === '.mgp7'
    ) {
      // 写入文件内容
      await fs.promises.writeFile(path, text, { encoding: 'utf8' })
    } else {
      await dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: '该文件类型不支持保存'
      })
    }
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `文件保存错误:${(err as Error).message}`
    })
  }
}
/**
 * 递归处理指定路径的目录结构
 * @param {string} path - 要处理的文件或目录的路径
 * @returns {Promise<DirectoryNode>} 该路径对应的目录节点对象，包含子节点的递归结构
 */
export async function processDirectory(path: string): Promise<DirectoryNode> {
  const stats = await fs.promises.lstat(path)
  const node: DirectoryNode = {
    path: path,
    name: path.split('\\').pop() || '',
    kind: stats.isDirectory() ? 'directory' : 'file',
    children: []
  }

  if (stats.isDirectory()) {
    // 读取目录中的条目并递归处理每个子项
    const entries = await fs.promises.readdir(path, { withFileTypes: true })
    // 添加排序逻辑
    entries.sort((a, b) => {
      if (a.isDirectory() && b.isFile()) return -1 // 目录在前
      if (a.isFile() && b.isDirectory()) return 1 // 文件在后
      return a.name.localeCompare(b.name) // 同类型按名称排序
    })
    for (const entry of entries) {
      const itemPath = join(path, entry.name)
      const item = await processDirectory(itemPath)
      node.children!.push(item)
    }
  }
  return node
}

// 创建工程
export async function create_hollysys(): Promise<void> {
  if (global.globalpaths) {
    // 创建文件夹路径
    const path1 = join(global.globalpaths[0], '招标')
    const path2 = join(global.globalpaths[0], '设计')
    const path3 = join(global.globalpaths[0], '组态')
    await fs.promises.mkdir(path1, { recursive: true })
    await fs.promises.mkdir(path2, { recursive: true })
    await fs.promises.mkdir(path3, { recursive: true })
    createDirectory1(path1)
    createDirectory2(path2)
    createDirectory3(path3)
    await dialog.showMessageBox({
      type: 'info',
      title: '信息',
      message: '创建成功!'
    })
  } else {
    await dialog.showMessageBox({
      type: 'question',
      title: '问题',
      message: '请先选择要操作的文件夹！'
    })
  }
}

// 数据分类,相应IPC函数
export async function hollysysDATA(): Promise<void> {
  if (global.globalpaths) {
    if (hasFileInTree(global.globalDirectoryTree, '数据库.xlsx')) {
      const datapath = join(global.globalpaths[0], '组态')
      classification(datapath)
      // 创建完成的提示信息
      await dialog.showMessageBox({
        type: 'info',
        title: '信息',
        message: '数据分类完成！'
      })
    } else {
      await dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: '请先将数据库.xlsx文件放入工程目录!'
      })
    }
  } else {
    await dialog.showMessageBox({
      type: 'question',
      title: '问题',
      message: '请先选择要操作的文件夹！'
    })
  }
}
// 更新对应的EXCEL,相应IPC函数
export async function hollysysExcel(): Promise<void> {
  if (global.globalpaths) {
    const excelpath = join(global.globalpaths[0], '组态')
    generateExcelFilesPOU(excelpath)
    generateExcelFilesPID(excelpath)
    generateExcelFilesHIM(excelpath)
    await dialog.showMessageBox({
      type: 'info',
      title: '信息',
      message: 'EXCEL更新成功!'
    })
  } else {
    await dialog.showMessageBox({
      type: 'question',
      title: '问题',
      message: '请先选择要操作的文件夹！'
    })
  }
}
// 生成回路,相应IPC函数
export async function hollysysPID(): Promise<void> {
  try {
    if (!global.globalpaths) {
      await dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: '请先选择要操作的文件夹！'
      })
      return
    }
    const workspaceFolder = join(global.globalpaths[0], '组态')
    // 获取当前工作区路径 典型回路.xlsx
    const folderPath1 = join(workspaceFolder, '典型回路.xlsx')
    // 获取当前工作区路径POU替换输入下的文件夹
    const folderPath2 = join(workspaceFolder, '典型回路输入')
    const folderPath3 = join(workspaceFolder, '典型回路输出')
    const files = getFilesInDirectory(folderPath2)
    const Exceldata = readExcelFile(folderPath1) // 调用函数读取Excel文件
    if (Exceldata) {
      const newJsonxml = excelToXmlContent(Exceldata) // 调用函数将Excel数据转换为XML内容
      //console.log('回路个数',newJsonxml.length);
      for (let i = 0; i < newJsonxml.length; i++) {
        if (newJsonxml[i].length > 0) {
          // 获取文件名,绝对路径
          //console.log('poU个数',newJsonxml[i].length);
          const folderPathXML = join(folderPath2, files[i])
          // 读取 XML 文件内容
          const xmlContentM7 = fs.readFileSync(folderPathXML, 'utf8')
          // 解析 XML
          const parserM7 = new XMLParser(parserOptions)
          const jsonM7 = parserM7.parse(xmlContentM7)
          // 判断文件是M6还是M7
          const m6orm7 =
            jsonM7.pou && jsonM7.pou.PouData && jsonM7.pou.PouData.CFCElementList ? 'm7' : 'm6'
          for (let j = 0; j < newJsonxml[i].length; j++) {
            if (m6orm7 === 'm6') {
              const json = addTextInXml(folderPathXML, newJsonxml[i][j])
              //修改生成后的文件名称
              json.pou.name = `${json.pou.name}${j}`
              // 将更改后jsonData内容写入文件
              const folderPathOut = join(folderPath3, `${j}${files[i]}`)
              // console.log('文件路径', folderPathOut)
              generateXmlFile(folderPathOut, json)
            } else if (m6orm7 === 'm7') {
              // 确定这个回路里有多少个cfc标签
              const cfclength = Exceldata.jsonData[i][0].length
              const json = addTextInXmlm7(folderPathXML, newJsonxml[i][j], cfclength)
              //修改生成后的文件名称
              json.pou.Name = `${json.pou.Name}${j}`
              json.pou.PouData['@_POUSelfShowName'] = json.pou.Name
              json.pou.VarsData.GroupName = json.pou.Name
              // json.pou.XmlVersion = '1.0'
              // 将更改后jsonData内容写入文件
              const folderPathOut = join(folderPath3, `${j}${files[i]}`)
              // console.log('文件路径', folderPathOut)
              generateXmlFilem7(folderPathOut, json)
            }
          }
        } else {
          // console.log('不生成回路')
        }
      }
    } else {
      await dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: '读取 Excel 文件失败，请检查文件是否存在且格式正确'
      })
    }
    await dialog.showMessageBox({
      type: 'info',
      title: '信息',
      message: '已生成回路!'
    })
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `生成典型回路出错:${(err as Error).message}`
    })
  }
}
// 读写替换表,相应IPC函数
export async function hollysysRWexcel(): Promise<void> {
  try {
    const excelpath = join(global.globalpaths[0], '组态', '点名替换.xlsx')
    const outputFilePath = join(global.globalpaths[0], '组态', '点名替换对应表.xlsx')
    if (!excelpath) {
      await dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: '请先生成点名替换表！'
      })
      return
    }
    // 选择替换表是读还是写
    const RWexcel = await dialog.showMessageBox({
      type: 'info',
      title: '信息',
      message: '读写点名替换表?',
      buttons: ['读替换表', '写替换表'], // 按钮顺序影响返回值
      defaultId: 0, // 默认选中第一个按钮（是）
      cancelId: 0 // 按ESC时视为取消
    })
    // 同步读取文件内容
    const data = fs.readFileSync(excelpath) // 使用同步方法读取文件
    // 解析 Excel 文件
    const workbook = XLSX.read(data, { type: 'buffer' })
    // 获取所有工作表的名称
    const sheetName: string[] = workbook.SheetNames
    const jsonData: string[] = [] // 使用 const 声明并初始化
    if (RWexcel.response === 0) {
      for (let i = 0; i < sheetName.length; i++) {
        // 获取工作表数据
        const worksheet = workbook.Sheets[sheetName[i]]
        // 将工作表数据转换为二维数组
        const sheetData: string[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1
        }) as string[][]
        // 读取第一列内容(跳过标题行)
        const firstColumn = sheetData
          .slice(1)
          .filter((row) => row.length > 0) // 过滤空行
          .map((row) => row[0] ?? '') // 处理可能的空单元格
        jsonData.push(...firstColumn)
        //console.log(jsonData);
      }
      // 处理数据：去重并过滤纯数值
      const processedData = Array.from(new Set(jsonData.map(String))).filter((str) => {
        const trimmed = str.trim()
        // 保留空字符串
        if (trimmed === '') return true
        // 检查是否为纯数值（可以转换为数字且转换后与原字符串一致）
        const isPureNumber = !isNaN(Number(trimmed)) && String(Number(trimmed)) === trimmed
        if (isPureNumber) return false
        // 检查长度和字符集（仅小写字母）
        return trimmed.length >= 6 && /^[0-9a-zA-Z._@[\]]+$/.test(trimmed)
      })
      // 处理数据，分离项名和变量名
      const processedData2D = processedData.map((item) => [item]) // 关键修复：一维转二维
      const Out_Data = processedData2D.map(([str]) => {
        const index = str.indexOf('.')
        if (index === -1) return [str, ''] // 无点号则第二部分为空
        return [str.substring(0, index), str.substring(index)]
      })
      const worksheetData = [['变量名', '项名', '替换名'], ...Out_Data] // 直接合并二维数据
      // 写入 Excel 文件
      const outputWorkbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
      XLSX.utils.book_append_sheet(outputWorkbook, worksheet, '点名对应')
      XLSX.writeFile(outputWorkbook, outputFilePath)
      await dialog.showMessageBox({
        type: 'info',
        title: '信息',
        message: '已读取点名替换表!'
      })
    } else {
      // 同步读取文件内容
      const outdata = fs.readFileSync(outputFilePath) // 使用同步方法读取文件
      // 解析 Excel 文件
      const outworkbook = XLSX.read(outdata, { type: 'buffer' })
      // 获取工作表数据
      const outworksheet = outworkbook.Sheets['点名对应']
      const outsheetData: string[][] = XLSX.utils.sheet_to_json(outworksheet, {
        header: 1
      }) as string[][]
      // console.log(outsheetData)
      // 提取 outsheetData 第一列数据
      const outsheetFirstColumnSet = outsheetData
        .map((row) => row[0] + row[1])
        .filter((item) => item !== undefined && item !== '')
      // 检查第三列（替换名列）是否完全为空（跳过标题行）
      const hasNonEmptySecondColumn = outsheetData
        .slice(1)
        .some((row) => row.length > 1 && row[2] != null && row[2] !== '')
      if (!hasNonEmptySecondColumn) {
        dialog.showMessageBox({
          type: 'warning',
          title: '警告',
          message: '替换名列全部为空,请检查Excel数据!'
        })
        return // 提前终止
      }
      //回写点名替换表
      for (let i = 0; i < sheetName.length; i++) {
        // 获取工作表数据
        const worksheet = workbook.Sheets[sheetName[i]]
        // 将工作表数据转换为二维数组
        const sheetData: string[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1
        }) as string[][]
        for (let id = 1; id < sheetData.length; id++) {
          // 跳过标题行
          const index = outsheetFirstColumnSet.findIndex((item) => item === sheetData[id][0])
          const newsheetData = [sheetData[id][0]]
          if (index !== -1 && outsheetData[index].length > 2) {
            // console.log(outsheetData[index])
            for (let j = 2; j < outsheetData[index].length; j++) {
              newsheetData.push(outsheetData[index][j] + outsheetData[index][1])
            }
            sheetData[id] = newsheetData
          } else {
            // 未找到匹配项，保持原样
            // 获取 outsheetData 中最长子数组的长度
            const maxLength = outsheetData.reduce((max, row) => Math.max(max, row.length), 0)
            for (let j = 2; j < maxLength; j++) {
              newsheetData.push(sheetData[id][0])
            }
            sheetData[id] = newsheetData
          }
        }
        // 将修改后的数据转换回工作表对象
        const newWorksheet = XLSX.utils.aoa_to_sheet(sheetData)
        // 更新工作簿中的工作表
        workbook.Sheets[sheetName[i]] = newWorksheet
        //console.log(jsonData);
      }
      // 保存修改后的工作簿到文件
      XLSX.writeFile(workbook, excelpath) // 覆盖原文件
      // 已填写点名替换表
      await dialog.showMessageBox({
        type: 'info',
        title: '信息',
        message: '已填写点名替换表!'
      })
    }
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `读写替换表出错:${(err as Error).message}`
    })
  }
}
// 替换POU,相应IPC函数
export async function hollysysPOU(): Promise<void> {
  // 每次命令被执行时，此处的代码将被运行
  try {
    if (!global.globalpaths) {
      await dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: '请先选择要操作的文件夹！'
      })
      return
    }
    // 选择文件名是否替换
    const isname = await dialog.showMessageBox({
      type: 'info',
      title: '信息',
      message: '是否生成新的POU名称?',
      buttons: ['是', '否'], // 按钮顺序影响返回值
      defaultId: 0, // 默认选中第一个按钮（是）
      cancelId: 0 // 按ESC时视为取消
    })
    // console.log('isname', isname.response)
    const workspaceFolder = join(global.globalpaths[0], '组态')
    // 获取当前工作区路径 点名替换.xlsx
    const folderPath1 = join(workspaceFolder, '点名替换.xlsx')
    const Exceldata = readExcelFile(folderPath1) // 调用函数读取Excel文件

    // 获取当前工作区路径POU替换输入下的文件夹
    const folderPath2 = join(workspaceFolder, 'POU替换输入')
    const folderPath3 = join(workspaceFolder, 'POU替换输出')
    const files = getFilesInDirectory(folderPath2)
    for (let i = 0; i < files.length; i++) {
      // 获取文件名,绝对路径
      const folderPathXML = join(folderPath2, files[i])
      const ext = extname(files[i]).toLowerCase() // 获取小写扩展名
      let xmlContent: XmlContent | null = null // 使用let并初始化;
      if (ext === '.xml') {
        xmlContent = getTextFromXml(folderPathXML)
        // } else if (ext === '.json') {    //M7没有json文件了
        //   xmlContent = getTextFromJson(folderPathXML)
      } else {
        await dialog.showMessageBox({
          type: 'question',
          title: '问题',
          message: `不支持的文件类型: ${ext}`
        })
      }
      const xml_txt = JSON.parse(JSON.stringify(xmlContent?.textContent))
      // 检查 xmlContent 是否为 null
      if (xmlContent && xmlContent.textContent) {
        // 检查POU内是否有隐藏对象
        if (Exceldata?.jsonData[i]?.length !== xmlContent.textContent.length + 1) {
          await dialog.showMessageBox({
            type: 'question',
            title: '问题',
            message: `${Exceldata?.sheetName[i]}文件数据长度不一致,检查POU隐藏对象`
          })
          continue
        }
        //和EXCEL表格工作表的第二行是否为 null
        if (Exceldata?.jsonData[i][1] && Exceldata?.jsonData[i][1] !== null) {
          // console.log(`第${i+1}个文件有数据`,Exceldata?.jsonData[i][1].length);
          // 一个模板多个替换
          for (let k = 1; k < Exceldata?.jsonData[i][1].length; k++) {
            // 第二个循环替换点名
            for (let j = 0; j < xmlContent.textContent.length; j++) {
              //检测EXCEL数据与XML文件点名是否匹配
              if (xmlContent.textContent[j] === Exceldata?.jsonData[i][j + 1][k - 1]) {
                if (
                  Exceldata?.jsonData[i][j + 1][k] !== '' &&
                  Exceldata?.jsonData[i][j + 1][k] !== undefined
                ) {
                  //console.log('替换',Exceldata?.jsonData[i][j + 1][k]);
                  xmlContent.textContent[j] = Exceldata?.jsonData[i][j + 1][k]
                }
              } else {
                // console.log(xmlContent.textContent[j], '++++', Exceldata?.jsonData[i][j + 1][k - 1])
                await dialog.showMessageBox({
                  type: 'question',
                  title: '问题',
                  message: xmlContent.textContent[j] + '检查数据'
                })
              }
            }
            if (
              // 如果值没有改变，就不生成文件
              xmlContent.textContent.length === xml_txt.length &&
              xmlContent.textContent.every((value, index) => value === xml_txt[index])
            ) {
              // console.log('不生成文件')
              continue
            }
            // 读取 XML 文件内容
            const xmlContentM7 = fs.readFileSync(folderPathXML, 'utf8')
            // 解析 XML
            const parserM7 = new XMLParser(parserOptions)
            const jsonM7 = parserM7.parse(xmlContentM7)
            // 判断文件是M6还是M7
            const m6orm7 =
              jsonM7.pou && jsonM7.pou.PouData && jsonM7.pou.PouData.CFCElementList ? 'm7' : 'm6'
            if (m6orm7 === 'm6') {
              // 将更改后jsonData内容写入文件，返回新的json对象
              const newJson = updateTextInXml(folderPathXML, xmlContent)
              if (isname.response === 0) {
                //修改生成后的文件名称
                newJson.pou.name = `${newJson.pou.name}${k}`
              }
              // console.log('文件路径', newJson.pou.name)
              // 将更改后jsonData内容写入文件
              const folderPathOut = join(folderPath3, `${k}${files[i]}`)
              //console.log('文件路径',folderPathOut);
              generateXmlFile(folderPathOut, newJson)
            } else if (m6orm7 === 'm7') {
              // 将更改后jsonData内容写入文件，返回新的json对象
              const newJson = updateTextInXmlm7(folderPathXML, xmlContent)
              if (isname.response === 0) {
                //修改生成后的文件名称
                newJson.pou.Name = `${newJson.pou.Name}${k}`
                newJson.pou.PouData['@_POUSelfShowName'] = newJson.pou.Name
                newJson.pou.VarsData.GroupName = newJson.pou.Name
              }
              // 将更改后jsonData内容写入文件
              const folderPathOut = join(folderPath3, `${k}${files[i]}`)
              // console.log('文件路径', folderPathOut)
              generateXmlFilem7(folderPathOut, newJson)
            }
          }
        } else {
          // console.log(`第${i+1}个文件没有数据，请检查点名表`);
          await dialog.showMessageBox({
            type: 'question',
            title: '问题',
            message: `第${i + 1}个文件没有数据，请检查点名表`
          })
        }
      } else {
        await dialog.showMessageBox({
          type: 'question',
          title: '问题',
          message: `XML 文件解析失败: ${files[i]}`
        })
      }
    }
    // console.log('已生成替换POU');
    await dialog.showMessageBox({
      type: 'info',
      title: '信息',
      message: '已生成替换POU!'
    })
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `生成替换POU出错:${(err as Error).message}`
    })
  }
}
// 更新POU变量表,相应IPC函数
export async function hollysysPOUExcel(): Promise<void> {
  try {
    if (!global.globalpaths) {
      await dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: '请先选择要操作的文件夹！'
      })
      return
    }
    const workspaceFolder = join(global.globalpaths[0], '组态')
    // 获取当前工作区路径POU替换输入下的文件夹
    const folderPath = join(workspaceFolder, 'POU点名统计')
    const files = getFilesInDirectory(folderPath)
    // let index = 0;  // 索引
    const workbook = XLSX.utils.book_new() // 创建新的工作簿
    // 生成 点名统计.xlsx 文件
    const worksheetData = [
      // 工作表表头
      ['POU名', '点名', '类型']
    ]
    for (const file of files) {
      const ext = extname(file).toLowerCase() // 获取小写扩展名
      // 获取文件名,绝对路径
      const folderPathXML = join(folderPath, file)
      let XmlContent: XmlContent | null = null // 使用let并初始化;
      if (ext === '.xml') {
        // 调用函数XML解析函数
        XmlContent = getTextFromXml(folderPathXML)
        // } else if (ext === '.json') {
        //   // 调用函数JSON解析函数//M7没有json文件了
        //   XmlContent = getTextFromJson(folderPathXML)
      } else {
        await dialog.showMessageBox({
          type: 'question',
          title: '问题',
          message: `不支持的文件类型: ${ext}`
        })
      }
      // 获取XML文件中的点名数组内容
      const textContent = XmlContent?.textContent || []
      // 获取XML文件中的点类型数组内容
      const typeContent = XmlContent?.typeContent || []
      // 假设替换点名为空字符串
      const newRows = textContent.map((originalName, index) => [
        file,
        originalName,
        typeContent[index]
      ])
      // 假设替换点名为空字符串
      // const newRows = textContent.map((originalName) => [file, originalName])
      // 拼接数组
      worksheetData.push(...newRows)
      // index++;         // 更新索引
    }

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData) // 将数据转换为工作表
    //console.log(`文件夹下XML文件名: ${file}`);
    XLSX.utils.book_append_sheet(workbook, worksheet, '统计') // 将工作表添加到工作簿中

    const filePath = join(workspaceFolder, '点名统计.xlsx') // 获取文件路径
    XLSX.writeFile(workbook, filePath) // 将工作簿写入文件

    // 向用户显示一个消息框
    await dialog.showMessageBox({
      type: 'info',
      title: '信息',
      message: 'POU点名统计完成!'
    })
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `创建新pou替换excel文件出错:${(err as Error).message}`
    })
  }
}
// 生成ST顺控,相应IPC函数
export async function hollysysST(): Promise<void> {
  try {
    if (!global.globalpaths) {
      await dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: '请先选择要操作的文件夹！'
      })
      return
    }
    const workspaceFolder = join(global.globalpaths[0], '组态')
    // 获取当前工作区路径 ST框架.xlsx
    const folderPath1 = join(workspaceFolder, 'ST框架.xlsx')
    const folderPath2 = join(workspaceFolder, 'ST顺控')
    const st_txt: string[] = excelToST(folderPath1)
    const outputFilePath = join(folderPath2, `${st_txt[0]}.st`)
    // 将文本内容写入文件
    fs.writeFile(outputFilePath, st_txt[1], 'utf8', () => {})
    await dialog.showMessageBox({
      type: 'info',
      title: '信息',
      message: '已生成ST顺控!'
    })
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `生成ST顺控出错:${(err as Error).message}`
    })
  }
}
// 替换ST,相应IPC函数
export async function hollysysSTPOU(): Promise<void> {
  // 每次命令被执行时，此处的代码将被运行
  try {
    if (!global.globalpaths) {
      await dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: '请先选择要操作的文件夹！'
      })
      return
    }
    const workspaceFolder = join(global.globalpaths[0], '组态')
    // 获取当前工作区路径 点名替换.xlsx
    const folderPath1 = join(workspaceFolder, 'ST变量表.xlsx')
    const Exceldata = readExcelFile(folderPath1) // 调用函数读取Excel文件

    // 获取当前工作区路径POU替换输入下的文件夹
    const folderPath2 = join(workspaceFolder, 'ST顺控')
    const folderPath3 = join(workspaceFolder, 'ST替换输出')
    const files = getFilesInDirectory(folderPath2)
    for (let i = 0; i < files.length; i++) {
      // 获取文件名,绝对路径
      const folderPathST = join(folderPath2, files[i])
      const ext = extname(files[i]).toLowerCase() // 获取小写扩展名
      // console.log(`文件: ${i}`);
      // 同步读取文件内容i
      let stFileContent = ''
      if (
        ext === '.st' &&
        Exceldata &&
        Exceldata.jsonData &&
        Exceldata.jsonData[i] &&
        Array.isArray(Exceldata.jsonData[i][1])
      ) {
        stFileContent = fs.readFileSync(folderPathST, 'utf8')
        // console.log(`文件内容: ${Exceldata?.jsonData[i][1].length}`);
        // 一个顺控要替换几次
        for (let k = 1; k < Exceldata?.jsonData[i][1].length; k++) {
          // console.log(`替换几次: ${k}`);
          // 一个顺控中有多少点要替换
          for (let j = 1; j < Exceldata?.jsonData[i].length; j++) {
            // console.log(`点次数: ${j}`);
            if (Exceldata?.jsonData[i][j][k] !== '' && Exceldata?.jsonData[i][j][k] !== undefined) {
              const regex = new RegExp(Exceldata?.jsonData[i][j][k - 1], 'g') // 创建带全局标志的正则表达式
              stFileContent = stFileContent.replace(regex, Exceldata?.jsonData[i][j][k]) // 重新赋值
              // console.log('替换',Exceldata?.jsonData[i][j][0],Exceldata?.jsonData[i][j][k]);
            }
          }
          const outputFilePath = join(folderPath3, `${k - 1 + files[i]}`)
          // console.log(`路径: ${outputFilePath}`);
          // 将文本内容写入文件
          fs.writeFile(outputFilePath, stFileContent, 'utf8', (err) => {
            if (err) {
              console.error('文件写入错误:', err)
            } else {
              console.log('保存路径', outputFilePath)
            }
          })
        }
      } else {
        throw new Error(`不支持的文件类型: ${ext}`)
      }
    }
    await dialog.showMessageBox({
      type: 'info',
      title: '信息',
      message: '已生成替换ST!'
    })
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `生成替换ST出错:${(err as Error).message}`
    })
  }
}
// 更新ST变量表,相应IPC函数
export async function hollysysSTExcel(): Promise<void> {
  try {
    if (!global.globalpaths) {
      await dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: '请先选择要操作的文件夹！'
      })
      return
    }
    const workspaceFolder = join(global.globalpaths[0], '组态')
    // 获取当前工作区路径POU替换输入下的文件夹
    const folderPath = join(workspaceFolder, 'ST顺控')
    const files = getFilesInDirectory(folderPath)
    let index = 0 // 索引
    const workbook = XLSX.utils.book_new() // 创建新的工作簿
    for (const file of files) {
      // 获取文件名,绝对路径
      const folderPathXML = join(folderPath, files[index])
      // 调用函数XML解析函数
      const stFileContent = fs.readFileSync(folderPathXML, 'utf8')
      const st_string = stFileContent.split('\n')
      const english_strings: string[] = []
      for (let i = 0; i < st_string.length; i++) {
        // 提取英文字符串
        const match = st_string[i].match(/\b[A-Za-z0-9_]+\b/g)
        if (match) {
          // 定义要过滤掉的关键词
          const keywordsToFilter = [
            'IF',
            'THEN',
            'ELSE',
            'END_IF',
            'WHILE',
            'END_WHILE',
            'FOR',
            'NEXT',
            'CASE',
            'END_CASE',
            'RETURN',
            'EXIT'
          ]
          // 过滤掉数值项、长度小于等于5的字符串以及指定的关键词
          const preFilteredStrings = match.filter(
            (item) =>
              isNaN(Number(item)) &&
              item.length > 5 &&
              !keywordsToFilter.includes(item.toUpperCase())
          )
          english_strings.push(...preFilteredStrings)
        }
      }
      // 去除重复值
      const new_st_var = Array.from(new Set(english_strings))
      // console.log('读取数据', new_st_var)
      // 生成 ST变量表v.xlsx 文件v
      const worksheetData = [['变量名', '替换名']] // 工作表表头
      // 拼接数组
      //console.log('读取数据',english_strings.map(str => [str]));
      worksheetData.push(...new_st_var.map((str) => [str]))
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData) // 将数据转换为工作表
      //console.log(`文件夹下XML文件名: ${file}`);
      XLSX.utils.book_append_sheet(workbook, worksheet, file) // 将工作表添加到工作簿中
      index++ // 更新索引
    }

    const filePath = join(workspaceFolder, 'ST变量表.xlsx') // 获取文件路径
    XLSX.writeFile(workbook, filePath) // 将工作簿写入文件

    // 向用户显示一个消息框
    await dialog.showMessageBox({
      type: 'info',
      title: '信息',
      message: 'ST变量表EXCEL已成功创建!'
    })
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `读取ST文档变量失败:${(err as Error).message}`
    })
  }
}
// 备份excel文件,相应IPC函数
export async function hollysysBF(): Promise<void> {
  try {
    if (!global.globalpaths) {
      await dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: '请先选择要操作的文件夹！'
      })
      return
    }
    const workspaceFolder = join(global.globalpaths[0], '组态')
    // 获取完整时间字符串（本地时间）
    // 获取当前时间对象
    const now = new Date()
    const currentTime = now.toLocaleString()
    const safeFilename = currentTime
      .replace(/\//g, '-') // 替换斜杠为连字符
      .replace(/:/g, '-') // 替换冒号为连字符
      .replace(/\s/g, '_') // 替换空格为下划线
      .slice(0, -3) // 删除最后三位字符
    console.log(`当前时间：${safeFilename}`)
    // 获取当前工作区路径POU替换输入下的文件夹
    const folderPath = join(workspaceFolder, '备份', safeFilename)
    fs.mkdirSync(folderPath, { recursive: true })
    const files = getFilesInDirectory(workspaceFolder)
    for (const file of files) {
      const ext = extname(file).toLowerCase() // 获取文件小写扩展名
      if (ext === '.xlsx') {
        const src = join(workspaceFolder, file)
        const dest = join(folderPath, file)
        fs.copyFileSync(src, dest)
        // console.log(`成功复制文件: ${file}`);
      }
    }
    // 向用户显示一个消息框
    await dialog.showMessageBox({
      type: 'info',
      title: '信息',
      message: '已备份excel文件!'
    })
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `备份excel文件出错:${(err as Error).message}`
    })
  }
}
// 创建文件夹1
async function createDirectory1(path1: string): Promise<void> {
  try {
    // 创建招标文件夹
    const pathlist1 = ['物质清单', '招标输出']
    for (const paths of pathlist1) {
      const path = join(path1, paths)
      await fs.promises.mkdir(path, { recursive: true })
    }
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `创建招标新工程出错:${(err as Error).message}`
    })
  }
}
// 创建文件夹2
async function createDirectory2(path2: string): Promise<void> {
  try {
    // 创建设计文件夹
    const pathlist2 = ['IO清单输出', 'FAT报告', '联调报告']
    for (const paths of pathlist2) {
      const path = join(path2, paths)
      await fs.promises.mkdir(path, { recursive: true })
    }
    // 复制IO清单.xlsm文件到目标目录
    const stFilePath = join(__dirname, '../../resources', 'IO清单.xlsm')
    const destFilePath = join(path2, 'IO清单.xlsm')
    try {
      await fs.promises.copyFile(stFilePath, destFilePath)
    } catch (copyErr) {
      // console.error(`文件复制失败: ${(copyErr as Error).message}`)
      await dialog.showMessageBox({
        type: 'error',
        title: '文件复制错误',
        message: `复制IO清单.xlsm文件失败:${(copyErr as Error).message}`
      })
    }
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `创建设计新工程出错:${(err as Error).message}`
    })
  }
}
// 创建文件夹3
async function createDirectory3(path3: string): Promise<void> {
  try {
    // 创建组态文件夹
    const pathlist3 = [
      'POU替换输出',
      'POU替换输入',
      '典型回路输出',
      '典型回路输入',
      '画面修改输出',
      '画面修改输入',
      'ST替换输出',
      'ST顺控',
      'POU点名统计',
      '备份'
    ]
    for (const paths of pathlist3) {
      const path = join(path3, paths)
      await fs.promises.mkdir(path, { recursive: true })
    }
    // 生成ST .xlsx 文件
    const workbook1 = XLSX.utils.book_new()
    const worksheetData1 = [
      ['顺控名', '故障步', '步号', '分支跳转1', '分支跳转2'],
      ['HOLLYSYS', 'S100', 'S1', 'S3'],
      ['', '', 'S2', ''],
      ['', '', 'S3', '']
    ]
    const worksheet1 = XLSX.utils.aoa_to_sheet(worksheetData1)
    XLSX.utils.book_append_sheet(workbook1, worksheet1, '顺控')

    const filePath1 = join(path3, 'ST框架.xlsx')
    XLSX.writeFile(workbook1, filePath1)
    // 生成画面 .xlsx文件
    // 顺控画面
    const workbook2 = XLSX.utils.book_new()
    const worksheetData21 = [
      ['顺控步', '阀门或泵', '阀门或泵', '阀门或泵', '描述', '模拟量显示'],
      ['所有被控量', '1000XV001', '1000XV002', '1000P001', '1000PIC001', '1000HIC001'],
      ['S1', '开', '开', '关', '0', '20', '第一步开阀'],
      ['S2', '开', '关', '关', '自动', '50', '第二步关阀', '1000PT001']
    ]
    const worksheet21 = XLSX.utils.aoa_to_sheet(worksheetData21)
    XLSX.utils.book_append_sheet(workbook2, worksheet21, '顺控')
    // 联锁画面
    const worksheetData22 = [
      ['正常值', '模拟量', '数字量', '描述1', '描述2', '投切', '关系', '输出', '正常值'],
      // eslint-disable-next-line prettier/prettier
      ['0', '1000PT001', '1000PT001_H', '1000PT001压力高', '>=4MPA', '1000PT001_BP', 'AND','1000PT001_OUT','0'],
      ['0', '1000PT002', '1000PT002_H', '1000PT002压力高', '>=4MPA', '1000PT001_BP', '', '', ''],
      ['1', '', '1000PT003_H', '1000PT003压力高', '', '', '', '', '']
    ]
    const worksheet22 = XLSX.utils.aoa_to_sheet(worksheetData22)
    XLSX.utils.book_append_sheet(workbook2, worksheet22, '联锁')
    // OCS位置画面
    const worksheetData23 = [
      ['名称', '位置', '楼层', '方位', '分光箱', '配电箱', '站号地址', '备注'],
      // eslint-disable-next-line prettier/prettier
      ['1000RJU001', '脱硫', '1楼', '西北', '1000RJU001', '1000RJU001', '10#10','演示']
    ]
    const worksheet23 = XLSX.utils.aoa_to_sheet(worksheetData23)
    XLSX.utils.book_append_sheet(workbook2, worksheet23, '位置')
    const filePath2 = join(path3, '标准画面.xlsx')
    XLSX.writeFile(workbook2, filePath2)
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `创建组态新工程出错:${(err as Error).message}`
    })
  }
}
// 检测文件是否存在
function hasFileInTree(tree: DirectoryNode[], targetFilename: string): boolean {
  const search = (node: DirectoryNode): boolean => {
    if (node.kind === 'file' && node.name === targetFilename) {
      return true // 找到文件
    }
    if (node.kind === 'directory' && node.children) {
      return node.children.some((child) => search(child)) // 递归子节点
    }
    return false
  }
  return tree.some((root) => search(root)) // 检查所有根节点
}
// 数据分类,分类函数
function classification(datapath: string): void {
  try {
    const folderPath = join(datapath, '数据库.xlsx')
    const sheetname = ['AO', 'K-VIO-AO', 'AI', 'K-VIO-AI', 'DOV', 'K-VIO-DOV', 'DI', 'K-VIO-DI']
    // 同步读取文件内容
    const data = fs.readFileSync(folderPath) // 使用同步方法读取文件
    // 解析 Excel 文件
    const workbook = XLSX.read(data, { type: 'buffer' })
    const workbookdata: string[][][] = []
    //获取工作表不同位号数据
    for (let i = 0; i < sheetname.length; i++) {
      // 获取工作表数据
      const worksheet = workbook.Sheets[sheetname[i]]
      // 将工作表数据转换为二维数组
      //jsonData.push([]);
      let sheetData: string[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]
      sheetData = sheetData.map((row) => [...row.slice(0, 4), sheetname[i]])
      workbookdata.push(sheetData)
      // jsonData.push(sheetData);
      // console.log(sheetname[i])
    }
    // console.log(workbookdata)
    //整理数据
    const boxdata: string[][] = [
      ['分组编号', '第一个点类型', '点名', '分类顺序:', 'AO', 'AI', 'DOV', 'DI']
    ]
    for (let i = 0; i < workbookdata.length; i++) {
      for (let j = 2; j < workbookdata[i].length; j++) {
        if (
          workbookdata[i][j][0] === undefined ||
          workbookdata[i][j][0].includes('BY') ||
          workbookdata[i][j][0].includes('PN') ||
          workbookdata[i][j][0].includes('SPA')
        ) {
          continue
        } else {
          // 去除字母和下划线加上站号作为分组编号
          const rawString =
            workbookdata[i][j][3] +
            '#' +
            workbookdata[i][j][0].replace(/[a-zA-Z_]/g, '') +
            workbookdata[i][j][0].replace(/[0-9_]/g, '')[0]
          // 提取已有的分组编号
          const boxNumber = boxdata.map((row) => row[0])
          // 获取索引号
          const index = boxNumber.indexOf(rawString)

          if (index !== -1) {
            boxdata[index].push(workbookdata[i][j][0])
          } else {
            boxdata.push([rawString, workbookdata[i][j][4], workbookdata[i][j][0]])
          }
        }
      }
    }
    // 写入 Excel 文件
    const outputWorkbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(boxdata)
    XLSX.utils.book_append_sheet(outputWorkbook, worksheet, '分类数据')
    const outputFilePath = join(datapath, '数据分类.xlsx')
    XLSX.writeFile(outputWorkbook, outputFilePath)
  } catch (err) {
    dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `数据分类报错:${(err as Error).message}`
    })
  }
}
// 获取目录下的所有文件，返回文件名数组
function getFilesInDirectory(directoryPath: string): string[] {
  try {
    // 读取目录内容
    const files = fs.readdirSync(directoryPath)
    // 返回文件名数组
    return files
  } catch (error) {
    const err = error as Error // 类型断言
    throw new Error(`读取目录时出错: ${err.message}`)
  }
}
//创建新pou替换excel文件
function generateExcelFilesPOU(excelpath: string): void {
  try {
    // 获取当前工作区路径POU替换输入下的文件夹
    const folderPath = join(excelpath, 'POU替换输入')
    const files = getFilesInDirectory(folderPath)
    // console.log('AAAAAABBBBBB')
    if (!files.length) {
      dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: 'POU替换输入文件夹下无文件！'
      })
      return
    }
    const workbook = XLSX.utils.book_new() // 创建新的工作簿
    for (const file of files) {
      // 获取文件名,绝对路径
      const folderPathXML = join(folderPath, file)
      const ext = extname(file).toLowerCase() // 获取小写扩展名
      let XmlContent: XmlContent | null = null // 使用let并初始化;
      if (ext === '.xml') {
        XmlContent = getTextFromXml(folderPathXML)
        // } else if (ext === '.json') {  //M7没有json文件了
        //   XmlContent = getTextFromJson(folderPathXML)
      } else {
        throw new Error(`不支持的文件类型: ${ext}`)
      }
      // 获取XML文件中的点名数组内容
      const textContent = XmlContent?.textContent || []
      // 生成 点名替换.xlsx 文件
      const worksheetData = [
        // 工作表表头
        ['原点名', '替换点名']
      ]
      // 假设替换点名为空字符串
      const newRows = textContent.map((originalName) => [originalName, ''])
      // 拼接数组
      worksheetData.push(...newRows)
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData) // 将数据转换为工作表
      //console.log(`文件夹下XML文件名: ${file}`);
      XLSX.utils.book_append_sheet(workbook, worksheet, file) // 将工作表添加到工作簿中
    }
    const filePath = join(excelpath, '点名替换.xlsx') // 获取文件路径
    XLSX.writeFile(workbook, filePath) // 将工作簿写入文件
  } catch (err) {
    dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `创建新pou替换excel文件出错:${(err as Error).message}`
    })
  }
}
//创建新典型回路excel文件
function generateExcelFilesPID(workspaceFolder: string): void {
  try {
    // 获取当前工作区路径典型回路输入下的文件夹
    const folderPath = join(workspaceFolder, '典型回路输入')
    const files = getFilesInDirectory(folderPath)
    if (!files.length) {
      dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: '典型回路输入文件夹下无文件！'
      })
      return
    }
    let index = 0 // 索引
    const workbook = XLSX.utils.book_new() // 创建新的工作簿
    for (const file of files) {
      // 获取文件名,绝对路径
      const folderPathXML = join(folderPath, files[index])
      const ext = extname(file).toLowerCase() // 获取小写扩展名
      let XmlContent: XmlContent | null = null // 使用let并初始化;
      if (ext === '.xml') {
        XmlContent = getTextFromXml(folderPathXML)
        // } else if (ext === '.json') {  //M7没有json文件了
        //   XmlContent = getTextFromJson(folderPathXML)
      } else {
        throw new Error(`不支持的文件类型: ${ext}`)
      }
      // 处理解析数据中的二维数组
      // 将二维数组转换为一维数组，每个元素是子数组的字符串形式
      const flattenedInputidxContent: string[] = (XmlContent?.inputidxContent || []).map(
        (subArray) => subArray.join(', ')
      )
      // 生成 点名替换.xlsx 文件
      const worksheetData: string[][] = [] // 工作表表头
      worksheetData.push(XmlContent?.typeContent || [])
      worksheetData.push(XmlContent?.idContent || [])
      worksheetData.push(XmlContent?.positionContent || [])
      worksheetData.push(flattenedInputidxContent)
      worksheetData.push(XmlContent?.textContent || [])
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData) // 将数据转换为工作表
      // console.log(`文件夹下XML文件名: ${file}`);
      XLSX.utils.book_append_sheet(workbook, worksheet, file) // 将工作表添加到工作簿中
      index++ // 更新索引
    }
    const filePath = join(workspaceFolder, '典型回路.xlsx') // 获取文件路径
    XLSX.writeFile(workbook, filePath) // 将工作簿写入文件
  } catch (err) {
    dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `创建新pou替换excel文件出错:${(err as Error).message}`
    })
  }
}
//读取 XML 文件中的 <text> 标签内容 m6 m7
function getTextFromXml(filePath: string): XmlContent | null {
  try {
    const typeContent: string[] = [] // 初始化为空数组
    const idContent: string[] = [] // 初始化为空数组
    const positionContent: string[] = [] // 初始化为空数组
    const textContent: string[] = [] // 初始化为空数组
    const inputidxContent: string[][] = [] // 初始化为空数组
    // 读取 XML 文件内容
    const xmlContentM7 = fs.readFileSync(filePath, 'utf8')
    // 解析 XML
    const parserM7 = new XMLParser(parserOptions)
    const jsonM7 = parserM7.parse(xmlContentM7)
    // console.log('实际 XML 结构:', JSON.stringify(jsonM7, null, 2))
    if (jsonM7.pou && jsonM7.pou.PouData && jsonM7.pou.PouData.CFCElementList) {
      // **************************m7读取方式*******************************************
      if (jsonM7.pou.PouData.CFCElementList?.CFCBox) {
        // 遍历 CFCElementList.CFCBox
        // 确保总是处理数组类型
        let cfcBoxes = jsonM7.pou.PouData.CFCElementList.CFCBox
        if (!Array.isArray(cfcBoxes)) {
          cfcBoxes = cfcBoxes ? [cfcBoxes] : []
        }
        for (const elementm7 of cfcBoxes) {
          // 添加类型
          typeContent.push('CFCBox') //获取对象的第一个键名
          // 组合ID
          let id_box_in = '' // 统计 CFCBox 中的输入引脚ID
          let id_box_out = '' // 统计 CFCBox 中的输出引脚ID
          // console.log('CFCBox:', JSON.stringify(elementm7.OutputPinList, null, 2))
          // 正确遍历 OutputPinList 数组
          if (elementm7.OutputPinList) {
            for (const pinItem of elementm7.OutputPinList.CFCOutputPin) {
              // 获取每个 CFCOutputPin 对象
              if (pinItem?.CFCPin['@_PinId'] !== undefined) {
                id_box_out += pinItem?.CFCPin['@_PinId'] + ','
              }
            }
            // console.log('id_box_out:', id_box_out)
          }
          // 同样修正 CFCInputPinList 的遍历（如果存在）
          if (elementm7.InputPinList) {
            for (const pinItem of elementm7.InputPinList.InputPin) {
              if (pinItem?.CFCPin['@_PinId'] !== undefined) {
                id_box_in += pinItem?.CFCPin['@_PinId'] + ','
              }
            }
            // console.log('id_box_in:', id_box_in)
          }
          id_box_out = id_box_out ? id_box_out.slice(0, -1) : ''
          const id_data = elementm7.CFCElement?.Element['@_id'] + ',' + id_box_in + id_box_out
          idContent.push(id_data || '') // 使用 push 方法将字符串添加到数组中
          // 组合XY坐标
          const position_data =
            elementm7?.CFCElement?.Element['@_PosX'] +
            ',' +
            elementm7?.CFCElement?.Element['@_PosY'] +
            ',' +
            (elementm7['@_PosX'] - elementm7?.CFCElement?.Element['@_PosX']) +
            ',' +
            (elementm7['@_PosY'] - elementm7?.CFCElement?.Element['@_PosY'])
          positionContent.push(position_data || '')
          // 添加点名
          if (elementm7?.FBVarName) {
            const text_data = elementm7?.FBVarName
            textContent.push(text_data || '')
          } else {
            const text_data = elementm7?.CFCElement?.Element['@_text']
            textContent.push(text_data || '')
          }
          // 添加输出的输入引脚ID
          inputidxContent.push([]) // 确保 inputidxContent[i] 是一个数组
          if (elementm7.InputPinList) {
            for (const pinItem of elementm7.InputPinList.InputPin) {
              const refPinID = pinItem['@_RefPinId'] ? pinItem['@_RefPinId'] : 0
              inputidxContent[inputidxContent.length - 1].push(refPinID)
            }
          }
        }
        // 遍历 CFCElementList.CFCInput
        let cfcInputes = jsonM7.pou.PouData.CFCElementList.CFCInput
        if (!Array.isArray(cfcInputes)) {
          cfcInputes = cfcInputes ? [cfcInputes] : []
        }
        for (const elementm7 of cfcInputes) {
          // 添加类型
          typeContent.push('CFCInput')
          // 组合ID
          const id_data =
            elementm7.CFCElement?.Element['@_id'] + ',' + elementm7.CFCOutputPin?.CFCPin['@_PinId']
          idContent.push(id_data || '') // 使用 push 方法将字符串添加到数组中
          // 组合XY坐标
          const position_data =
            elementm7?.CFCElement?.Element['@_PosX'] +
            ',' +
            elementm7?.CFCElement?.Element['@_PosY'] +
            ',' +
            (elementm7['@_AnchorPosX'] - elementm7?.CFCElement?.Element['@_PosX']) +
            ',' +
            (elementm7['@_AnchorPosY'] - elementm7?.CFCElement?.Element['@_PosY'])
          positionContent.push(position_data || '')
          // 添加点名
          const text_data = elementm7.CFCElement?.Element['@_text']
          textContent.push(text_data || '')
          // 添加输入引脚ID
          inputidxContent.push([])
        }
        // 遍历 CFCElementList.CFCOutput
        let cfcOutputs = jsonM7.pou.PouData.CFCElementList.CFCOutput
        if (!Array.isArray(cfcOutputs)) {
          cfcOutputs = cfcOutputs ? [cfcOutputs] : []
        }
        for (const elementm7 of cfcOutputs) {
          // 添加类型
          typeContent.push('CFCOutput')
          // 组合ID
          const id_data =
            elementm7.CFCElement?.Element['@_id'] + ',' + elementm7.InputPin?.CFCPin['@_PinId']
          idContent.push(id_data || '') // 使用 push 方法将字符串添加到数组中
          // 组合XY坐标
          const position_data =
            elementm7?.CFCElement?.Element['@_PosX'] +
            ',' +
            elementm7?.CFCElement?.Element['@_PosY']
          positionContent.push(position_data || '')
          // 添加点名
          const text_data = elementm7.CFCElement?.Element['@_text']
          textContent.push(text_data || '')
          // 添加输入引脚ID
          inputidxContent.push([elementm7.InputPin['@_RefPinId'] || ''])
        }
        // console.log('typeContent:', typeContent)
        // console.log('idContent:', idContent)
        // console.log('positionContent:', positionContent)
        // console.log('textContent:', textContent)
        // console.log('inputidxContent:', inputidxContent)
      }
    } else {
      // **************************m6读取方式*******************************************
      // 读取 XML 文件内容
      const xmlContent = fs.readFileSync(filePath, 'latin1')
      // 解析 XML
      const parser = new XMLParser(parserOptions)
      const json = parser.parse(xmlContent)
      //console.log('读取XML',JSON.stringify(json, null, 2));
      // 检查 json.pou.cfc 是否存在
      if (!json.pou || !json.pou.cfc || !Array.isArray(json.pou.cfc.element)) {
        dialog.showMessageBox({
          type: 'question',
          title: '问题',
          message: `${filePath}XML文件格式不正确!`
        })
        return null
      }
      // 统计 POU.XML文件中有多少个element对象
      const elementCount = json.pou.cfc.element.length

      // 提取 <text> 标签的内容
      for (let i = 0; i < elementCount; i++) {
        typeContent.push(json.pou.cfc.element[i]['@_type'] || '') // 使用 push 方法将字符串添加到数组中
        idContent.push(json.pou.cfc.element[i].id || '') // 使用 push 方法将字符串添加到数组中
        // 判断 element 中是否有 text 标签
        const hasText = json.pou.cfc.element[i].text !== undefined
        textContent.push(hasText ? json.pou.cfc.element[i].text : json.pou.cfc.element[i].AT_type)

        if (json.pou.cfc.element[i]['@_type'] === 'input') {
          positionContent.push(json.pou.cfc.element[i].AT_position || '') // 使用 push 方法将字符串添加到数组中
          inputidxContent.push([])
        } else if (json.pou.cfc.element[i]['@_type'] === 'output') {
          positionContent.push(json.pou.cfc.element[i].position || '') // 使用 push 方法将字符串添加到数组中
          inputidxContent.push([json.pou.cfc.element[i].Inputid || ''])
        } else if (json.pou.cfc.element[i]['@_type'] === 'box') {
          positionContent.push(json.pou.cfc.element[i].AT_position || '') // 使用 push 方法将字符串添加到数组中
          // 修复：统一处理单元素/多元素情况
          const inputs = json.pou.cfc.element[i].input
          const inputArray = Array.isArray(inputs) ? inputs : inputs ? [inputs] : []
          // const inputCount = json.pou.cfc.element[i].input ? json.pou.cfc.element[i].input.length : 0
          inputidxContent.push([]) // 确保 inputidxContent[i] 是一个数组
          // console.log('inputCount', inputArray.length)
          if (inputArray.length === 1) {
            inputidxContent[i].push(json.pou.cfc.element[i].input['@_inputid'] || 0)
          } else {
            for (let j = 0; j < inputArray.length; j++) {
              inputidxContent[i].push(json.pou.cfc.element[i].input[j]['@_inputid'] || 0)
            }
          }
        } else {
          positionContent.push(json.pou.cfc.element[i].position || '') // 使用 push 方法将字符串添加到数组中
          inputidxContent.push([])
        }
      }
    }
    // console.log('inputidxContent', inputidxContent)
    return { typeContent, idContent, positionContent, textContent, inputidxContent }
  } catch (err) {
    dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `读取 XML 文件出错:${(err as Error).message}`
    })
    return null
  }
}
//读取 JSON 文件中的 <text> 标签内容    已删除

//创建新画面修改excel文件   （思路不清晰、未完成）
function generateExcelFilesHIM(workspaceFolder: string): void {
  try {
    // 获取当前工作区路径画面修改输入下的文件夹
    const folderPath = join(workspaceFolder, '画面修改输入')
    const files = getFilesInDirectory(folderPath)
    if (!files.length) {
      dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: '画面修改输入文件夹下无文件！'
      })
      return
    }
    const workbook = XLSX.utils.book_new() // 创建新的工作簿
    const worknames = ['画面信息', '文字', '直线', '组合']
    // eslint-disable-next-line prettier/prettier
    const worksheetDatas = [['页面名称', '描述', '域号', '屏幕尺寸', '画面大小', '画面区域', '作者', '公司', '显示刻度', '全局配置', '是否生成报警点', '报警点', '符号更新', '符号大小', '模板'],
      // eslint-disable-next-line prettier/prettier
      ['页面名称', '对象名称', '旋转角度', '是否显示', '权限限制','禁操方式','文字内容', '文字颜色', '字体', '垂直对齐', '水平对齐', '自适应框', '缩放字体', '竖排文字', '换行'],
      // eslint-disable-next-line prettier/prettier
      ['页面名称', '对象名称', '旋转角度', '是否显示', '权限限制','禁操方式','边框颜色', '边框宽度', '边框样式', '左箭头样式', '左箭头大小', '右箭头样式', '右箭头大小'],
      // eslint-disable-next-line prettier/prettier
      ['页面名称', '对象名称', '旋转角度', '是否显示', '符号库连接', '权限限制','禁操方式','属性1', '属性2', '属性3', '属性4', '属性5', '属性...']]
    // 读取数据
    const HmiContent: HmiContent[] = [] // 使用let并初始化;
    for (const file of files) {
      // 获取文件名,绝对路径
      const folderPathHMI = join(folderPath, file)
      const ext = extname(file).toLowerCase() // 获取小写扩展名
      if (ext === '.mgp7') {
        HmiContent.push(getTextFromHMI(folderPathHMI))
      } else {
        throw new Error(`不支持的文件类型: ${ext}`)
      }
    }
    // 遍历写入Excel
    for (let i = 0; i < worknames.length; i++) {
      const worksheetData = [worksheetDatas[i]]
      for (let j = 0; j < HmiContent.length; j++) {
        if (i === 0) {
          worksheetData.push(HmiContent[j].pageContent)
        }
        if (i === 1) {
          worksheetData.push(...HmiContent[j].textContent)
        }
        if (i === 2) {
          worksheetData.push(...HmiContent[j].lineContent)
        }
        if (i === 3) {
          worksheetData.push(...HmiContent[j].groupContent)
        }
      }
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData) // 将数据转换为工作表
      XLSX.utils.book_append_sheet(workbook, worksheet, worknames[i]) // 将工作表添加到工作簿中
    }

    const filePath = join(workspaceFolder, '画面修改.xlsx')
    XLSX.writeFile(workbook, filePath)
  } catch (err) {
    //待添加
    dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `读取文件失败:${(err as Error).message}`
    })
  }
}
//读取 MGP7 文件中的 <text> 标签内容    （思路不清晰、未完成）
function getTextFromHMI(filePath: string): HmiContent {
  try {
    // 1. 使用utf8编码读取文件
    const rawData = fs.readFileSync(filePath, 'utf8')
    // 2. 解析外层JSON结构
    const HmiJson = JSON.parse(rawData)
    // 3. 解析内部pou字段的JSON字符串
    // const poujson = JSON.parse(outerJson.pou);
    // console.log('读取JSON', JSON.stringify(HmiJson, null, 2))
    console.log('读取JSON', HmiJson)
    // 检查 json.pou.cfc 是否存在
    const pageContent: string[] = [] // 页面
    const textContent: string[][] = [] // 文字
    const lineContent: string[][] = [] // 直线
    const groupContent: string[][] = [] // 组合
    // 提取 <text> 标签的内容
    return { pageContent, textContent, lineContent, groupContent }
  } catch (err) {
    dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `处理文件失败:${(err as Error).message}`
    })
    return {
      pageContent: [],
      textContent: [],
      lineContent: [],
      groupContent: []
    }
  }
}
// 读取 Excel 文件内容并返回三维数组
function readExcelFile(filePath: string): ExcelContent | null {
  try {
    // 同步读取文件内容
    const data = fs.readFileSync(filePath) // 使用同步方法读取文件
    // 解析 Excel 文件
    const workbook = XLSX.read(data, { type: 'buffer' })
    // 获取所有工作表的名称
    const sheetName: string[] = workbook.SheetNames
    const jsonData: string[][][] = [] // 使用 const 声明并初始化
    for (let i = 0; i < sheetName.length; i++) {
      // 获取工作表数据
      const worksheet = workbook.Sheets[sheetName[i]]
      // 将工作表数据转换为二维数组
      //jsonData.push([]);
      const sheetData: string[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]
      jsonData.push(sheetData)
      //console.log(jsonData);
    }
    return { sheetName, jsonData }
  } catch (err) {
    dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `读取 Excel 文件出错: ${(err as Error).message}`
    })
    return null
  }
}
// 修改 XML 文件内容并返回修改后的 JSON 对象 (仅修改点名)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updateTextInXml(filePath: string, newJson: XmlContent): any {
  try {
    const xmlContent = fs.readFileSync(filePath, 'latin1') // 读取 XML 文件内容
    // 解析 XML
    const parser = new XMLParser(parserOptions)
    const json = parser.parse(xmlContent)

    if (!json.pou || !json.pou.cfc || !Array.isArray(json.pou.cfc.element)) {
      dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: 'XML文件格式不正确!'
      })
      return null
    }

    const elementCount = json.pou.cfc.element.length
    // 遍历元素集合，为每个元素设置或更新其属性
    for (let i = 0; i < elementCount; i++) {
      // 设置元素的id属性
      // json.pou.cfc.element[i].id = newJson.idContent[i];
      // 根据条件更新元素的text或AT_type属性
      if (json.pou.cfc.element[i].text !== undefined) {
        json.pou.cfc.element[i].text = newJson.textContent[i]
      } else {
        json.pou.cfc.element[i].AT_type = newJson.textContent[i]
      }
    }
    return json
  } catch (err) {
    dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `修改 XML 文件出错: ${(err as Error).message}`
    })
    return null
  }
}
// 修改 JSON 文件内容并返回修改后的 JSON 对象 (仅修改点名)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updateTextInXmlm7(filePath: string, newJson: XmlContent): any {
  try {
    // 读取 XML 文件内容
    const xmlContentM7 = fs.readFileSync(filePath, 'utf8')
    // 解析 XML
    const parserM7 = new XMLParser(parserOptions)
    const jsonM7 = parserM7.parse(xmlContentM7)
    // console.log('读取JSON',poujson.PouInfo.pou_data.pou_data);
    // 检查 json.pou.cfc 是否存在
    if (jsonM7.pou && jsonM7.pou.PouData && jsonM7.pou.PouData.CFCElementList) {
      // excle 数据的索引
      let index = 0
      // 遍历 CFCElementList.CFCBox
      // 确保总是处理数组类型
      let cfcBoxes = jsonM7.pou.PouData.CFCElementList.CFCBox
      if (!Array.isArray(cfcBoxes)) {
        cfcBoxes = cfcBoxes ? [cfcBoxes] : []
      }
      for (const elementm7 of cfcBoxes) {
        // 替换点名
        if (elementm7.FBVarName) {
          elementm7.FBVarName = newJson.textContent[index]
        } else {
          elementm7.CFCElement.Element['@_text'] = newJson.textContent[index]
        }
        index++
      }
      // 遍历 CFCElementList.CFCInput
      let cfcInputes = jsonM7.pou.PouData.CFCElementList.CFCInput
      if (!Array.isArray(cfcInputes)) {
        cfcInputes = cfcInputes ? [cfcInputes] : []
      }
      for (const elementm7 of cfcInputes) {
        // 替换点名
        elementm7.CFCElement.Element['@_text'] = newJson.textContent[index]
        index++
      }
      // 遍历 CFCElementList.CFCOutput
      let cfcOutputs = jsonM7.pou.PouData.CFCElementList.CFCOutput
      if (!Array.isArray(cfcOutputs)) {
        cfcOutputs = cfcOutputs ? [cfcOutputs] : []
      }
      for (const elementm7 of cfcOutputs) {
        // 替换点名
        elementm7.CFCElement.Element['@_text'] = newJson.textContent[index]
        index++
      }
    } else {
      dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: 'M7的文件格式不正确!'
      })
      return null
    }
    return jsonM7
  } catch (err) {
    dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `修改 JSON 文件出错: ${(err as Error).message}`
    })
    return null
  }
}
// 定义生成 XML 文件的函数
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateXmlFile(filePath: string, json: any): void {
  try {
    // 修改 @version 属性
    if (json['?xml'] && json['?xml']['@_version']) {
      json['?xml']['@_version'] = '1.0'
    } else {
      dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: 'XML 文件中未找到 @version 属性!'
      })
    }
    //console.log('新生成的',JSON.stringify(json, null, 2));
    // 创建 XMLBuilder 实例，并配置生成 XML 的选项
    const builder = new XMLBuilder(builderOptions)
    // 将 JSON 对象转换为 XML 字符串
    const xmlOutput = builder.build(json)
    // 将生成的 XML 字符串写入文件
    fs.writeFileSync(filePath, xmlOutput, 'latin1')
    // 向用户显示一个消息框
    // vscode.window.showInformationMessage('XML 文件已成功生成！');
  } catch (err) {
    dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `生成 XML 文件时出错: ${(err as Error).message}`
    })
  }
}
// 定义生成 json 文件的函数
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateXmlFilem7(filePath: string, json: any): void {
  try {
    // 修改 @version 属性
    if (json['?xml'] && json['?xml']['@_version']) {
      json['?xml']['@_version'] = '1.0'
    } else {
      dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: 'XML 文件中未找到 @version 属性!'
      })
    }
    //console.log('新生成的',JSON.stringify(json, null, 2));
    // 创建 XMLBuilder 实例，并配置生成 XML 的选项
    const builder = new XMLBuilder(builderOptions)
    // 将 JSON 对象转换为 XML 字符串
    const xmlOutput = builder.build(json)
    // 将生成的 XML 字符串写入文件
    fs.writeFileSync(filePath, xmlOutput, 'utf8')
  } catch (err) {
    dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `生成 M7 文件时出错: ${(err as Error).message}`
    })
  }
}
// 将EXCEL输入框的输入id字符串转换为二维数组，用于典型回路
function unflattenInputidxContent(
  flattenedInputidxContent: (string | null | undefined)[]
): string[][] {
  if (!Array.isArray(flattenedInputidxContent)) {
    return [] // 防止非数组输入
  }
  return flattenedInputidxContent.map((str) => {
    if (typeof str !== 'string') {
      return [''] // 处理非字符串值
    }
    return str.split(',').map((item) => item.trim())
  })
}
// 将 Excel 内容转换为典型回路 XML 的结构数据   M6  M7
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function excelToXmlContent(excel: ExcelContent): any {
  try {
    const newJson: XmlContent[][] = []
    // console.log('成功调用数据分析', excel.jsonData)
    for (let i = 0; i < excel.jsonData.length; i++) {
      // console.log('扩展名',ext);
      const m6orm7 = excel.jsonData[i][1][0].length > 3 ? 'M7' : 'M6'
      // console.log('type', excel.jsonData[i][1][0].length > 3 ? 'M7' : 'M6')
      let xml = 0 //同一典型回路要创建几个POU
      let index = 0 //同一POU下有几个典型回路i
      // 获取当前工作表的第五行点名的后缀
      const name_ext = excel.jsonData[i][4]
        .filter((cell: unknown) => typeof cell === 'string') // 基础类型过滤
        .map((cell: string) => {
          const trimmed = cell.trim()
          // 处理无后缀情况
          if (!trimmed.includes('.')) return ''
          const parts = trimmed.split('.')
          return parts.length > 1 ? `.${parts.pop()!.toUpperCase()}` : ''
        })
      // console.log('点名后缀', name_ext)
      // 获取当前工作表的前四行数据，前四行为常数
      const sheetid = excel.jsonData[i][1]
      const idlength = sheetid.length //获取ID长度
      let maxid_ele = 0 //定义点名最大ID，xml和json使用
      let maxid_pin = 0 //定义引脚名最大ID，json使用
      if (m6orm7 === 'M6') {
        maxid_ele = Math.max(...sheetid.map(Number)) //取最大ID然后累加
        // console.log('最大XMLID',maxid_ele);
      } else if (m6orm7 === 'M7') {
        const json_id = unflattenInputidxContent(sheetid) //将输入的数组转换为二维数组
        const id_ele: string[] = []
        for (let j = 0; j < json_id.length; j++) {
          id_ele.push(json_id[j][0])
        }
        const id_pin = json_id.flat()
        maxid_ele = Math.max(...id_ele.map(Number))
        maxid_pin = Math.max(...id_pin.map(Number))
        // console.log('最大JSONID',maxid_ele,maxid_pin);
        // maxid_ele = Math.max(...sheetid.map(Number)); //取最大ID然后累加
      }
      // 计算X,Y坐标的Y的最大值
      const sheetposit = excel.jsonData[i][2]
      let maxy = -Infinity
      if (sheetposit && sheetposit.length > 0) {
        for (let n = 0; n < sheetposit.length; n++) {
          // 遍历数组
          if (typeof sheetposit[n] === 'string') {
            const parts = sheetposit[n].split(',')
            const numberAfterComma = parseInt(parts[1], 10) // 转换为数字
            // 比较并记录最大值
            if (numberAfterComma > maxy) {
              if (m6orm7 === 'M6') {
                maxy = numberAfterComma + 5 //Macs6预留5个像素
              } else if (m6orm7 === 'M7') {
                maxy = numberAfterComma + 50 //Macs7预留50个像素
              }
            }
          } else {
            dialog.showMessageBox({
              type: 'question',
              title: '问题',
              message: `表格位置[${n}] 不是一个字符`
            })
          }
        }
      } else {
        dialog.showMessageBox({
          type: 'question',
          title: '问题',
          message: `表格位置为空`
        })
      }
      const sheetinputidx = unflattenInputidxContent(excel.jsonData[i][3])
      //开始数据替换计算,从6开始
      //console.log('表格行数',excel.jsonData[i].length);
      if (excel.jsonData[i].length > 5) {
        for (let j = 5; j < excel.jsonData[i].length; j++) {
          if (
            excel.jsonData[i][j][0] !== '' &&
            excel.jsonData[i][j][0] !== null &&
            excel.jsonData[i][j][0] !== undefined
          ) {
            if (!newJson[i]) {
              newJson[i] = []
            }
            if (!newJson[i][xml]) {
              newJson[i][xml] = {
                typeContent: [],
                idContent: [],
                positionContent: [],
                textContent: [],
                inputidxContent: []
              }
            }
            //添加回路类型
            newJson[i][xml].typeContent.push(...excel.jsonData[i][0])
            //添加回路ID
            if (m6orm7 === 'M6') {
              newJson[i][xml].idContent.push(...sheetid.map((item) => item + maxid_ele * index))
            } else if (m6orm7 === 'M7') {
              const json_id = unflattenInputidxContent(sheetid) //将输入的数组转换为二维数组
              for (let j = 0; j < json_id.length; j++) {
                let id_str = ''
                for (let k = 0; k < json_id[j].length; k++) {
                  if (k === 0) {
                    id_str += String(Number(json_id[j][k]) + maxid_ele * index)
                  } else {
                    id_str += ',' + String(Number(json_id[j][k]) + maxid_pin * index)
                  }
                }
                newJson[i][xml].idContent.push(id_str)
              }
            }
            //添加坐标
            if (m6orm7 === 'M6') {
              newJson[i][xml].positionContent.push(
                ...sheetposit.map(
                  (item) => `${item.split(',')[0]},${parseInt(item.split(',')[1]) + maxy * index}`
                )
              )
            } else if (m6orm7 === 'M7') {
              const json_xy = unflattenInputidxContent(sheetposit) //将输入的数组转换为二维数组
              for (let j = 0; j < json_xy.length; j++) {
                let xy_str = ''
                if (json_xy[j].length === 4) {
                  xy_str =
                    json_xy[j][0] +
                    ',' +
                    (Number(json_xy[j][1]) + maxy * index) +
                    ',' +
                    json_xy[j][2] +
                    ',' +
                    json_xy[j][3]
                } else {
                  xy_str = json_xy[j][0] + ',' + (Number(json_xy[j][1]) + maxy * index)
                }
                newJson[i][xml].positionContent.push(xy_str)
              }
            }
            //添加输入引脚的Idx
            //newJson[i][xml].inputidxContent.push([]);
            for (let x = 0; x < sheetinputidx.length; x++) {
              for (let y = 0; y < sheetinputidx[x].length; y++) {
                if (!newJson[i][xml].inputidxContent[x + idlength * index]) {
                  newJson[i][xml].inputidxContent[x + idlength * index] = []
                }
                if (sheetinputidx[x][y] !== '0' && sheetinputidx[x][y] !== '') {
                  if (m6orm7 === 'M6') {
                    newJson[i][xml].inputidxContent[x + idlength * index].push(
                      (parseInt(sheetinputidx[x][y]) + maxid_ele * index).toString()
                    )
                  } else if (m6orm7 === 'M7') {
                    newJson[i][xml].inputidxContent[x + idlength * index].push(
                      (parseInt(sheetinputidx[x][y]) + maxid_pin * index).toString()
                    )
                  }
                } else {
                  if (sheetinputidx[x][y] === '0') {
                    newJson[i][xml].inputidxContent[x + idlength * index].push('0')
                  } else {
                    newJson[i][xml].inputidxContent[x + idlength * index].push('')
                  }
                }
              }
            }
            //添加点名
            // console.log('newJson[i][xml].textContent', ...excel.jsonData[i][j])
            const new_text = excel.jsonData[i][j]
            for (let e = 0; e < name_ext.length; e++) {
              const cellValue = excel.jsonData[i][j][e]
              // 确保cellValue是字符串类型
              const currentCellStr = cellValue != null ? String(cellValue).trim() : ''
              if (!currentCellStr.includes(name_ext[e])) {
                new_text[e] = currentCellStr + name_ext[e]
              }
            }
            // console.log('new', ...new_text)
            newJson[i][xml].textContent.push(...new_text)
            index += 1 //索引加一
          } else {
            //console.log('创建新POU');
            xml += 1
            index = 0
          }
        }
      } else {
        if (!newJson[i]) {
          newJson[i] = []
        }
        // console.log('excel数据不足')
      }
    }
    // console.log('excel生成的json文件', newJson)
    return newJson
  } catch (err) {
    dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `典型回路数据分析出错: ${(err as Error).message}`
    })
    return null
  }
}
// 修改 XML 文件内容并返回修改后的 JSON 对象
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addTextInXml(filePath: string, newJson: XmlContent): any {
  try {
    const xmlContent = fs.readFileSync(filePath, 'latin1') // 读取 XML 文件内容
    // 解析 XML
    const parser = new XMLParser(parserOptions)
    const json = parser.parse(xmlContent)

    if (!json.pou || !json.pou.cfc || !Array.isArray(json.pou.cfc.element)) {
      dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: 'XML文件格式不正确!'
      })
      return null
    }
    //console.log('恭喜成功调用添加数据', json.pou.cfc.element);
    //计算一个POU中PID回路的个数
    const oldelementCount = json.pou.cfc.element.length //替换前的变量个数
    const pidCount = newJson.idContent.length / oldelementCount
    //console.log('回路个数', pidCount);
    //在原POU文件内添加新的回路
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elementtxt: any[] = []
    for (let m = 1; m < pidCount; m++) {
      //本身有一组回路，
      elementtxt.push(JSON.parse(JSON.stringify(json.pou.cfc.element)))
    }
    //console.log('添加数据', elementtxt);
    for (let m = 1; m < pidCount; m++) {
      //本身有一组回路，
      for (let n = 0; n < oldelementCount; n++) {
        json.pou.cfc.element.push(elementtxt[m - 1][n])
      }
      //console.log('回路内元素个数', json.pou.cfc.element.length);
    }

    //  遍历元素集合，为每个元素设置或更新其属性
    const newelementCount = json.pou.cfc.element.length
    for (let i = 0; i < newelementCount; i++) {
      // 设置元素的id属性
      json.pou.cfc.element[i].id = newJson.idContent[i]
      // 根据条件更新元素的text或AT_type属性
      if (json.pou.cfc.element[i].text !== undefined) {
        json.pou.cfc.element[i].text = newJson.textContent[i]
      } else {
        json.pou.cfc.element[i].AT_type = newJson.textContent[i]
      }
      // 根据元素类型更新位置相关属性
      if (json.pou.cfc.element[i]['@_type'] === 'input') {
        json.pou.cfc.element[i].AT_position = newJson.positionContent[i]
      } else if (json.pou.cfc.element[i]['@_type'] === 'output') {
        json.pou.cfc.element[i].position = newJson.positionContent[i]
        json.pou.cfc.element[i].Inputid = newJson.inputidxContent[i][0]
      } else if (json.pou.cfc.element[i]['@_type'] === 'box') {
        json.pou.cfc.element[i].AT_position = newJson.positionContent[i]
        // 对于box类型元素，更新其所有输入的inputid属性
        // const inputCount = json.pou.cfc.element[i].input ? json.pou.cfc.element[i].input.length : 0
        // 修复：统一处理单元素/多元素情况
        const inputs = json.pou.cfc.element[i].input
        const inputArray = Array.isArray(inputs) ? inputs : inputs ? [inputs] : []
        // console.log('inputCount', inputArray.length)
        if (inputArray.length === 1) {
          json.pou.cfc.element[i].input['@_inputid'] = newJson.inputidxContent[i][0]
        } else {
          for (let j = 0; j < inputArray.length; j++) {
            json.pou.cfc.element[i].input[j]['@_inputid'] = newJson.inputidxContent[i][j]
          }
        }
        // for (let j = 0; j < inputCount; j++) {
        //   json.pou.cfc.element[i].input[j]['@_inputid'] = newJson.inputidxContent[i][j]
        // }
      } else {
        json.pou.cfc.element[i].position = newJson.positionContent[i]
      }
    }
    //console.log('pou内容',json.pou.cfc.element);
    return json
  } catch (err) {
    dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `XML文件添加回路出错: ${(err as Error).message}`
    })
    return null
  }
}
// 修改 json 文件内容并返回修改后的 JSON 对象
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addTextInXmlm7(filePath: string, newJson: XmlContent, cfclength: number): any {
  try {
    // 计算一个POU中PID回路的个数
    const pidCount = newJson.textContent.length / cfclength
    // 读取 XML 文件内容
    const xmlContentM7 = fs.readFileSync(filePath, 'utf8')
    // 解析 XML
    const parserM7 = new XMLParser(parserOptions)
    const jsonM7 = parserM7.parse(xmlContentM7)
    if (jsonM7.pou && jsonM7.pou.PouData && jsonM7.pou.PouData.CFCElementList) {
      // console.log('textContent', newJson.textContent)
      // 增加 CFCElementList.CFCBox 确保总是处理数组类型
      let cfcBoxes = jsonM7.pou.PouData.CFCElementList.CFCBox
      if (!Array.isArray(cfcBoxes)) {
        cfcBoxes = cfcBoxes ? [cfcBoxes] : []
      }
      cfcBoxes = Array(pidCount)
        .fill(null)
        .flatMap(() => JSON.parse(JSON.stringify(cfcBoxes)))
      jsonM7.pou.PouData.CFCElementList.CFCBox = cfcBoxes
      // console.log('JSON', jsonM7.pou.PouData.CFCElementList.CFCBox)
      // 增加 CFCElementList.CFCInput 确保总是处理数组类型
      let cfcInputes = jsonM7.pou.PouData.CFCElementList.CFCInput
      if (!Array.isArray(cfcInputes)) {
        cfcInputes = cfcInputes ? [cfcInputes] : []
      }
      cfcInputes = Array(pidCount)
        .fill(null)
        .flatMap(() => JSON.parse(JSON.stringify(cfcInputes)))
      jsonM7.pou.PouData.CFCElementList.CFCInput = cfcInputes
      // 增加 CFCElementList.CFCOutput 确保总是处理数组类型
      let cfcOutputs = jsonM7.pou.PouData.CFCElementList.CFCOutput
      if (!Array.isArray(cfcOutputs)) {
        cfcOutputs = cfcOutputs ? [cfcOutputs] : []
      }
      cfcOutputs = Array(pidCount)
        .fill(null)
        .flatMap(() => JSON.parse(JSON.stringify(cfcOutputs)))
      jsonM7.pou.PouData.CFCElementList.CFCOutput = cfcOutputs
      // 将ID数组，转化为二维数组
      const newJson_idContent = unflattenInputidxContent(newJson.idContent)
      // 将XY坐标数组，转化为二维数组
      const newJson_positionContent = unflattenInputidxContent(newJson.positionContent)
      //***************开始替换************************/
      let box_count = 0
      let input_count = 0
      let output_count = 0
      for (let i = 0; i < cfclength; i++) {
        // console.log('i', i)
        if (newJson.typeContent[i] === 'CFCBox') {
          for (let j = 0; j < pidCount; j++) {
            const index = cfclength * j + i
            // console.log('CFCBox', newJson_idContent[index])
            // 修改点名
            if (jsonM7.pou.PouData.CFCElementList.CFCBox[box_count].FBVarName) {
              jsonM7.pou.PouData.CFCElementList.CFCBox[box_count].FBVarName =
                newJson.textContent[index]
            } else {
              jsonM7.pou.PouData.CFCElementList.CFCBox[box_count].CFCElement.Element['@_text'] =
                newJson.textContent[index]
            }
            // 修改ID
            // console.log('CFCBox', element[elementType].CFCInputPinList.length,element[elementType].CFCOutputPinList.length);
            let id_box = 0
            jsonM7.pou.PouData.CFCElementList.CFCBox[box_count].CFCElement.Element['@_id'] = Number(
              newJson_idContent[index][id_box]
            )
            const in_length =
              jsonM7.pou.PouData.CFCElementList.CFCBox[box_count].InputPinList.InputPin.length
            // console.log('in_length', in_length)
            for (let q = 0; q < in_length; q++) {
              id_box += 1
              // console.log('CFCInputPin', element[elementType].CFCInputPinList[q].CFCInputPin.CFCPin.PinID);
              jsonM7.pou.PouData.CFCElementList.CFCBox[box_count].InputPinList.InputPin[q].CFCPin[
                '@_PinId'
              ] = Number(newJson_idContent[index][id_box])
            }
            const out_length =
              jsonM7.pou.PouData.CFCElementList.CFCBox[box_count].OutputPinList.CFCOutputPin.length
            // console.log('out_length', out_length)
            for (let q = 0; q < out_length; q++) {
              id_box += 1
              // console.log('CFCOutputPin', element[elementType].CFCOutputPinList[q].CFCOutputPin.CFCPin.PinID);
              jsonM7.pou.PouData.CFCElementList.CFCBox[box_count].OutputPinList.CFCOutputPin[
                q
              ].CFCPin['@_PinId'] = Number(newJson_idContent[index][id_box])
            }
            //修改XY坐标
            jsonM7.pou.PouData.CFCElementList.CFCBox[box_count].CFCElement.Element['@_PosX'] =
              Number(newJson_positionContent[index][0])
            jsonM7.pou.PouData.CFCElementList.CFCBox[box_count].CFCElement.Element['@_PosY'] =
              Number(newJson_positionContent[index][1])
            jsonM7.pou.PouData.CFCElementList.CFCBox[box_count]['@_PosX'] =
              Number(newJson_positionContent[index][0]) + Number(newJson_positionContent[index][2])
            jsonM7.pou.PouData.CFCElementList.CFCBox[box_count]['@_PosY'] =
              Number(newJson_positionContent[index][1]) + Number(newJson_positionContent[index][3])
            // 引脚连接
            const pin_length =
              jsonM7.pou.PouData.CFCElementList.CFCBox[box_count].InputPinList.InputPin.length
            for (let q = 0; q < pin_length; q++) {
              // console.log('pin_length', q)
              if (
                jsonM7.pou.PouData.CFCElementList.CFCBox[box_count].InputPinList.InputPin[q][
                  '@_RefPinId'
                ]
              ) {
                jsonM7.pou.PouData.CFCElementList.CFCBox[box_count].InputPinList.InputPin[q][
                  '@_RefPinId'
                ] = Number(newJson.inputidxContent[index][q])
                //console.log('引脚连接', element[elementType].CFCInputPinList[q].CFCInputPin.CFCPin.PinName,Number(newJson.inputidxContent[i][q]));
              }
            }
            box_count += 1
          }
        } else if (newJson.typeContent[i] === 'CFCInput') {
          for (let j = 0; j < pidCount; j++) {
            const index = cfclength * j + i
            // console.log('CFCInput', newJson_idContent[index])
            //修改点名
            jsonM7.pou.PouData.CFCElementList.CFCInput[input_count].CFCElement.Element['@_text'] =
              newJson.textContent[index]
            //修改ID
            jsonM7.pou.PouData.CFCElementList.CFCInput[input_count].CFCElement.Element['@_id'] =
              Number(newJson_idContent[index][0])
            jsonM7.pou.PouData.CFCElementList.CFCInput[input_count].CFCOutputPin.CFCPin['@_PinId'] =
              Number(newJson_idContent[index][1])
            //修改XY坐标
            jsonM7.pou.PouData.CFCElementList.CFCInput[input_count].CFCElement.Element['@_PosX'] =
              Number(newJson_positionContent[index][0])
            jsonM7.pou.PouData.CFCElementList.CFCInput[input_count].CFCElement.Element['@_PosY'] =
              Number(newJson_positionContent[index][1])
            jsonM7.pou.PouData.CFCElementList.CFCInput[input_count]['@_AnchorPosX'] =
              Number(newJson_positionContent[index][0]) + Number(newJson_positionContent[index][2])
            jsonM7.pou.PouData.CFCElementList.CFCInput[input_count]['@_AnchorPosY'] =
              Number(newJson_positionContent[index][1]) + Number(newJson_positionContent[index][3])
            input_count += 1
          }
          // console.log('bbb', jsonM7.pou.PouData.CFCElementList.CFCInput)
          // 替换点名
          // jsonM7.pou.PouData.CFCElementList.CFCBox.
        } else if (newJson.typeContent[i] === 'CFCOutput') {
          for (let j = 0; j < pidCount; j++) {
            const index = cfclength * j + i
            // console.log('CFCOutput', newJson_idContent[index])
            //修改点名
            jsonM7.pou.PouData.CFCElementList.CFCOutput[output_count].CFCElement.Element['@_text'] =
              newJson.textContent[index]
            //修改ID
            // console.log('CFCOutput', element[elementType].CFCInputPin.CFCPin.PinID);
            jsonM7.pou.PouData.CFCElementList.CFCOutput[output_count].CFCElement.Element['@_id'] =
              Number(newJson_idContent[index][0])
            jsonM7.pou.PouData.CFCElementList.CFCOutput[output_count].InputPin.CFCPin['@_PinId'] =
              Number(newJson_idContent[index][1])
            //修改XY坐标
            jsonM7.pou.PouData.CFCElementList.CFCOutput[output_count].CFCElement.Element['@_PosX'] =
              Number(newJson_positionContent[index][0])
            jsonM7.pou.PouData.CFCElementList.CFCOutput[output_count].CFCElement.Element['@_PosY'] =
              Number(newJson_positionContent[index][1])
            // 引脚连接
            jsonM7.pou.PouData.CFCElementList.CFCOutput[output_count].InputPin['@_RefPinId'] =
              Number(newJson.inputidxContent[index][0])
            output_count += 1
          }
          // 替换点名
          // jsonM7.pou.PouData.CFCElementList.CFCBox.
        }
        // 替换点名
        // jsonM7.pou.PouData.CFCElementList.CFCBox.
      }
      return jsonM7
    } else {
      dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: 'XML文件格式不正确!'
      })
      return null
    }
  } catch (err) {
    dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `M7文件添加回路出错: ${(err as Error).message}`
    })
    return null
  }
}
// 将 Excel 内容转换为顺控ST 内容
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function excelToST(filePath: string): any {
  try {
    // 同步读取文件内容
    const data = fs.readFileSync(filePath) // 使用同步方法读取文件
    // 解析 Excel 文件
    const workbook = XLSX.read(data, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    // 获取工作表数据
    const worksheet = workbook.Sheets[sheetName]
    // 将工作表数据转换为二维数组
    const worksheetData: string[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
    // 处理数据过滤掉第一行和前两列,得到分支数据
    const follData = worksheetData.slice(1).map((row) => row.slice(2))
    // 处理数据过滤掉第一行和前两列,得到分支数据
    const faulData = worksheetData.slice(1).map((row) => row.slice(1))
    // 行列转换得到主数据
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hostData: any[][] = Array.from({ length: follData[0].length }, () => [])
    for (let i = 0; i < follData.length; i++) {
      for (let j = 0; j < follData[i].length; j++) {
        if (!hostData[j]) {
          hostData[j] = ['']
        }
        hostData[j][i] = follData[i][j]
      }
    }
    //在主数据的最后添加故障步号
    hostData.push([])
    for (let i = 0; i < faulData.length; i++) {
      hostData[hostData.length - 1].push(faulData[i][0] !== undefined ? faulData[i][0] : '')
    }
    //删除重复和空行，得到所有的步号
    const allData = Array.from(new Set(hostData.flat())).filter((item) => item !== '')
    // console.log('follData顺控步', follData)
    // console.log('hostData顺控步', hostData)
    // console.log('allData顺控步', allData)
    //读ST框架模板
    const stFilePath = join(__dirname, '../../resources', 'HOLLYSYS.ST')
    // 动态读取文件内容
    const stFileContent = fs.readFileSync(stFilePath, 'utf8')
    //console.log('模板文本', stFileContent);
    const newST = stFileContent.split('\n')
    //摘取模板中需要替换的部分,初始化、开始步、结束步、急停步
    const index2 = newST.indexOf('\t0:\t(*步描述：S0*)\r')
    const index3 = newST.indexOf('\t1:\t(*最后步描述：S1*)\r')
    const index4 = newST.indexOf('\t100:(*停止步描述：S100*)\r')
    const index5 = newST.indexOf('\tEND_CASE\r')
    const stepHST = newST.slice(index2, index3)
    const stepEST = newST.slice(index3, index4)
    const stepSST = newST.slice(index4, index5)
    // 删除从索引52开始的132个元素
    newST.splice(index2, index5 - index2)
    // 循环遍历allData，插入要修改的值
    let indexist = newST.indexOf('\t\t(*******初始化顺控里步的标志*********)\r') + 1
    let indexhst = newST.indexOf('\t(******顺控第一步开始******)\r') + 1
    for (let i = 0; i < allData.length; i++) {
      // console.log('DatA', allData[i])
      // 在初始化数组中插入数据i
      newST.splice(indexist, 0, `\t\tHOLLYSYS_STEP_IN_${allData[i]} := FALSE;\r`)
      newST.splice(indexist, 0, `\t\tHOLLYSYS_STEP_OUT_${allData[i]} := FALSE;\r`)
      newST.splice(indexist, 0, `\t\tHOLLYSYS_STEP_JUMP_${allData[i]} := FALSE;\r`)
      newST.splice(indexist, 0, `\t\tHOLLYSYS_STEP_ALA_${allData[i]} := FALSE;\r`)
      indexist += 4 //每次循环插入4行
      //在开始步数组中插入数据
      indexhst += 4
      const step_cnt1 = allData[i].match(/\d+/g) //当前步号
      if (i < hostData[0].length - 1) {
        const sth = stepHST.map((str) => str.replace(/S0/g, allData[i]))
        const step_cnt2 = allData[i + 1].match(/\d+/g) //下一步号
        sth[0] = `\t${step_cnt1}:\t(*步描述：${allData[i]}*)\r`
        sth[sth.length - 4] = `\t\t\t\t\tHOLLYSYS_STEP_CNT :=${step_cnt2};\t\t\t\t(*进入下一步*)\r`
        if (follData[i].length > 1 && follData[i][1] !== '') {
          sth[11] = `\t\t\t\tHOLLYSYS_STEP_CNT :=${follData[i][1].match(/\d+/g)};\r`
        }
        newST.splice(indexhst, 0, ...sth)
        indexhst += sth.length
      } else if (i === hostData[0].length - 1) {
        //在结束步数组中插入数据
        indexhst += 1
        const ste = stepEST.map((str) => str.replace(/S1/g, allData[i]))
        ste[0] = `\t${step_cnt1}:\t(*最后步描述：${allData[i]}*)\r`
        newST.splice(indexhst, 0, ...ste)
        indexhst += ste.length
        indexhst += 1
      } else if (
        i <
        allData.length - hostData[hostData.length - 1].filter((item) => item !== '').length
      ) {
        // console.log('分支步', allData[i])
        // 可能循环到多个相同值，只添加一次
        let isInserted = true
        //newST.splice(indexhst,0,'插入位置');
        //在分支步数组中插入数据；如果分支跳转后面还有跳转，插入开始步。如果没有插入结束步。
        for (let m = 0; m < follData.length; m++) {
          for (let n = 0; n < follData[m].length; n++) {
            if (follData[m][n] === allData[i] && isInserted) {
              isInserted = false
              if (n < follData[m].length - 1) {
                const stfh = stepHST.map((str) => str.replace(/S0/g, allData[i]))
                const step_cnt3 = follData[m][n + 1].match(/\d+/g) //下一步号
                stfh[0] = `\t${step_cnt1}:\t(*步描述：${allData[i]}*)\r`
                stfh[stfh.length - 4] =
                  `\t\t\t\t\tHOLLYSYS_STEP_CNT :=${step_cnt3};\t\t\t\t(*进入下一步*)\r`
                newST.splice(indexhst, 0, ...stfh)
                indexhst += stfh.length
              } else {
                const stfe = stepEST.map((str) => str.replace(/S1/g, allData[i]))
                stfe[0] = `\t${step_cnt1}:\t(*最后步描述：${allData[i]}*)\r`
                newST.splice(indexhst, 0, ...stfe)
                indexhst += stfe.length
              }
            }
          }
        }
      } else {
        //在故障停止步数组中插入数据
        //console.log('故障步', allData[i]);
        if (
          i ===
          allData.length - hostData[hostData.length - 1].filter((item) => item !== '').length
        ) {
          indexhst += 1
        }
        const sts = stepSST.map((str) => str.replace(/S100/g, allData[i]))
        sts[0] = `\t${step_cnt1}:\t(*步描述：${allData[i]}*)\r`
        //判断故障步是否为最后一步
        if (i < allData.length - 1) {
          const step_cnt4 = allData[i + 1].match(/\d+/g) //下一步号
          sts[sts.length - 4] =
            `\t\t\t\t\tHOLLYSYS_STEP_CNT :=${step_cnt4};\t\t\t\t(*进入下一步*)\r`
        } else {
          sts[sts.length - 4] = `\t\t\t\t\tHOLLYSYS_RESET := TRUE;\t\t\t\t(*结束*)\r`
        }
        newST.splice(indexhst, 0, ...sts)
        indexhst += sts.length
      }
    }
    //修改初始化后的进入的步号
    const index6 = newST.indexOf('\t\t(*******进入顺控开始步*******)\r')
    newST[index6 + 2] = `\t\t\tHOLLYSYS_STEP_CNT :=${allData[0].match(/\d+/g)};\r`
    //修改顺控名称
    const newStTxt: string[] = []
    newStTxt.push(worksheetData[1][0])
    newStTxt.push(newST.join('\n').replace(/HOLLYSYS/g, worksheetData[1][0]))
    //console.log('生成文本', newStTxt);
    return newStTxt
  } catch (err) {
    dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `读取Excel生成ST出错: ${(err as Error).message}`
    })
    return null
  }
}
