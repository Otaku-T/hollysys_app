/* eslint-disable prettier/prettier */
import { dialog, BrowserWindow } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { join, dirname, basename } from 'path'
import ExcelJS from 'exceljs'
import fs from 'fs'

// 定义 IOdataList 类型
interface IOdataList {
  AI: (string | number)[][]
  AO: (string | number)[][]
  DI: (string | number)[][]
  DOV: (string | number)[][]
  K_VIO_AI: (string | number)[][]
  K_VIO_AO: (string | number)[][]
  K_VIO_DI: (string | number)[][]
  K_VIO_DOV: (string | number)[][]
}
// 调用外部exe
const execFileAsync = promisify(execFile)

//  OPS截图
export async function ops_tool(
  loopCount: number,
  intervalTime: number,
  xCoordinate: number,
  yCoordinate: number
): Promise<void> {
  try {
    const mainWindow = BrowserWindow.getFocusedWindow() // 获取当前窗口
    // 选择文件夹
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择截图保存目录' // 添加明确标题
    })
    if (canceled || !filePaths[0]) {
      await dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: '没有选择文件夹！'
      })
      return
    }
    // 最小化窗口到任务栏
    mainWindow?.minimize()
    // 循环操作逻辑
    const GUIPath = join(__dirname, '../../resources', 'GUI.exe')
    // 构造 EXE 参数
    const args = [
      '-m',
      'ops',
      '-p',
      filePaths[0], // 路径参数
      '-l',
      String(loopCount),
      '-t',
      String(intervalTime),
      '-x',
      String(xCoordinate),
      '-y',
      String(yCoordinate)
    ]
    await execFileAsync(GUIPath, args)
    // console.log(filePaths[0])
    // 添加窗口恢复（在执行成功后）
    mainWindow?.restore() // <--- 新增恢复窗口
    await dialog.showMessageBox({
      type: 'info',
      title: '信息',
      message: `OPS截图已完成:${loopCount}张`
    })
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `OPS截图出错:${(err as Error).message}`
    })
  }
}
// 合并Excel
export async function excel_merge(excel_mRow: number, excel_mindex: number): Promise<void> {
  try {
    // 选择文件
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'], // 修改为文件选择模式
      filters: [
        {
          name: 'Excel Files',
          extensions: ['xls', 'xlsx'] // 添加文件类型过滤
        }
      ],
      title: '选择Excel文件' // 修改对话框标题
    })
    if (canceled || !filePaths[0]) {
      await dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: '没有选择Excel文件！'
      })
      return
    }
    // 执行合并Excel
    // 读取原文件
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePaths[0])

    // 创建新工作簿（保留原格式的关键）
    const newWorkbook = new ExcelJS.Workbook()
    newWorkbook.created = workbook.created
    newWorkbook.modified = workbook.modified
    newWorkbook.properties = workbook.properties

    // 创建合并后的工作表
    const mergedSheet = newWorkbook.addWorksheet('Merged')
    // mergedSheet.addRow(['合并后的数据'])

    // 遍历工作表
    const sheetNames = workbook.worksheets.map((sheet) => sheet.name).slice(excel_mindex)
    // console.log(sheetNames)
    if (sheetNames.length === 0) {
      await dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: '工作簿内没有工作表可处理！'
      })
      return
    }
    for (const sheetName of sheetNames) {
      // console.log(sheetName)
      const sourceSheet = workbook.getWorksheet(sheetName)
      if (!sourceSheet) {
        continue // 或者 throw new Error(`工作表 "${sheetName}" 不存在`)
      }
      // 复制列宽
      sourceSheet?.columns.forEach((col, idx) => {
        mergedSheet.getColumn(idx + 1).width = col.width
      })

      // 处理行数据
      const rowsToProcess =
        sheetName === sheetNames[0]
          ? sourceSheet?.getRows(1, sourceSheet.rowCount)
          : sourceSheet?.getRows(excel_mRow + 1, sourceSheet.rowCount - excel_mRow)
      if (rowsToProcess) {
        // 添加数据并保留样式
        rowsToProcess.forEach((sourceRow) => {
          const newRow = mergedSheet.addRow(sourceRow.values)

          // 复制单元格样式
          sourceRow.eachCell((cell, colNumber) => {
            const newCell = newRow.getCell(colNumber)
            // 棅式和值的处理
            if (cell.type === ExcelJS.ValueType.Formula) {
              // 重新设置公式而不是复制 style
              newCell.value = { formula: cell.formula }
            } else {
              // 仅复制值和样式（不含公式）
              newCell.value = cell.value
              newCell.style = JSON.parse(JSON.stringify(cell.style))
            }
          })
        })
      }
    }

    // 保存文件
    const newPath = join(dirname(filePaths[0]), '合_' + basename(filePaths[0]))
    await newWorkbook.xlsx.writeFile(newPath)
    await dialog.showMessageBox({
      type: 'info',
      title: '信息',
      message: '合并Excel已完成'
    })
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `合并Excel出错:${(err as Error).message}`
    })
  }
}
// 拆分Excel
export async function excel_split(excel_sRow: number): Promise<void> {
  try {
    // 选择文件
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'], // 修改为文件选择模式
      filters: [
        {
          name: 'Excel Files',
          extensions: ['xls', 'xlsx'] // 添加文件类型过滤
        }
      ],
      title: '选择Excel文件' // 修改对话框标题
    })
    if (canceled || !filePaths[0]) {
      await dialog.showMessageBox({
        type: 'question',
        title: '问题',
        message: '没有选择Excel文件！'
      })
      return
    }
    // 执行合拆分Excel
    // console.log(excel_sRow)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePaths[0])
    // 新建文件夹
    const filepath = join(dirname(filePaths[0]), 'out')
    fs.mkdirSync(filepath, { recursive: true })

    for (const sourceSheet of workbook.worksheets) {
      // 创建分类存储Map，键为第一列值，值为行数据集合
      const categoryMap = new Map<string, ExcelJS.Row[]>()

      // 遍历有效数据行（从指定行开始）
      sourceSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber <= excel_sRow) return // 跳过标题行

        const categoryCell = row.getCell(1)
        const categoryKey = categoryCell.text || '未分类'

        if (!categoryMap.has(categoryKey)) {
          categoryMap.set(categoryKey, [])
        }
        categoryMap.get(categoryKey)?.push(row)
      })

      // 为每个分类创建独立文件
      for (const [category, rows] of categoryMap) {
        const safeCategory = category.replace(/[\\/:*?"<>|]/g, '_') // 清理非法字符
        const fileName = `${sourceSheet.name}_${safeCategory}_${basename(filePaths[0])}`
        const filePath = join(filepath, fileName)

        const newWorkbook = new ExcelJS.Workbook()
        Object.assign(newWorkbook, {
          created: workbook.created,
          modified: new Date(),
          properties: workbook.properties
        })

        const newSheet = newWorkbook.addWorksheet(sourceSheet.name)
        // 新增表头复制逻辑（关键修改）
        // 获取原始表头行（从第1行到excel_sRow行）
        const headerRows = sourceSheet.getRows(1, excel_sRow) || []

        // 复制表头（包含样式）
        headerRows.forEach((headerRow) => {
          const newHeader = newSheet.addRow(headerRow.values)
          headerRow.eachCell((cell, colNumber) => {
            const newCell = newHeader.getCell(colNumber)
            newCell.style = JSON.parse(JSON.stringify(cell.style))
          })
        })

        // 复制列宽（包含样式）
        sourceSheet.columns?.forEach((col, idx) => {
          const newCol = newSheet.getColumn(idx + 1)
          newCol.width = col.width
          newCol.style = JSON.parse(JSON.stringify(col.style))
        })

        // 添加分类数据（保留原样式）
        rows.forEach((sourceRow) => {
          const newRow = newSheet.addRow(sourceRow.values)
          sourceRow.eachCell((cell, colNumber) => {
            const newCell = newRow.getCell(colNumber)
            newCell.style = JSON.parse(JSON.stringify(cell.style))
          })
        })
        // 保存为独立文件
        await newWorkbook.xlsx.writeFile(filePath)
      }
    }
    await dialog.showMessageBox({
      type: 'info',
      title: '信息',
      message: '拆分Excel已完成'
    })
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `拆分Excel出错:${(err as Error).message}`
    })
  }
}
// 调用POU6,相应IPC函数
export async function hollysysPOU6(): Promise<void> {
  const GUIPath = join(__dirname, '../../resources', 'POU6.exe')
  await execFileAsync(GUIPath)
}
// 显示PDF
export async function get_file_pdf(): Promise<void> {
  try {
    const url = join(__dirname, '../../resources', 'help.pdf')
    global.mainWindow.webContents.send('file-pdf', url)
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `PDF显示错误:${(err as Error).message}`
    })
  }
}

// 生成数据库
export async function hollysysIOdata(): Promise<void> {
  try {
    // 选择文件名是否替换
    const isname = await dialog.showMessageBox({
      type: 'info',
      title: '信息',
      message: '生成M6、M7数据库?',
      buttons: ['M6', 'M7'], // 按钮顺序影响返回值
      defaultId: 0, // 默认选中第一个按钮（是）
      cancelId: 0 // 按ESC时视为取消
    })
    // 定义路径
    const pathfile = join(global.globalpaths[0], '设计')
    const pathfileIO = join(pathfile, 'IO清单.xlsm')
    const pathfileIOout = join(pathfile, 'IO清单输出')
    const pathfileIOoutdata_k = join(pathfileIOout, '数据库_k.xlsx')
    const pathfileIOoutdata_vio = join(pathfileIOout, '数据库_vio.xlsx')
    const workbook = new ExcelJS.Workbook()
    // 读取 Excel 文件
    await workbook.xlsx.readFile(pathfileIO)
    // 获取 "IO清单" 工作表
    const worksheet = workbook.worksheets.find((ws) => ws.name === 'IO清单')
    if (!worksheet) {
      console.error('工作表 "IO清单" 不存在')
      return
    }

    // 收集工作表数据
    const data: string[][] = []
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber < 3) return // 跳过第 1 行
      const rowData: string[] = []
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber > 6 && colNumber < 28) rowData.push(cell.text) // 提取单元格文本内容
      })
      data.push(rowData)
    })

    // 创建新工作簿
    const workbookout_k = new ExcelJS.Workbook()
    const workbookout_vio = new ExcelJS.Workbook()
    const sheetname_k = ['AI', 'AO', 'DI', 'DOV']
    const sheetname_vio = ['K-VIO-AI', 'K-VIO-AO', 'K-VIO-DI', 'K-VIO-DOV']
    const worksheetouts_k: ExcelJS.Worksheet[] = []
    const worksheetouts_vio: ExcelJS.Worksheet[] = []
    for (let i = 0; i < sheetname_k.length; i++) {
      const worksheetout_k = workbookout_k.addWorksheet(sheetname_k[i])
      worksheetouts_k.push(worksheetout_k)
      const worksheetout_vio = workbookout_vio.addWorksheet(sheetname_vio[i])
      worksheetouts_vio.push(worksheetout_vio)
    }
    if (isname.response === 0) {  //生成M6数据库
      const Iodata_m6 =Ioto_data_m6(data)
       // 写入数据
       Iodata_m6.AI.forEach((row) => {
        worksheetouts_k[0].addRow(row)
      })
      Iodata_m6.AO.forEach((row) => {
        worksheetouts_k[1].addRow(row)
      })
      Iodata_m6.DI.forEach((row) => {
        worksheetouts_k[2].addRow(row)
      })
      Iodata_m6.DOV.forEach((row) => {
        worksheetouts_k[3].addRow(row)
      })
      Iodata_m6.K_VIO_AI.forEach((row) => {
        worksheetouts_vio[0].addRow(row)
      })
      Iodata_m6.K_VIO_AO.forEach((row) => {
        worksheetouts_vio[1].addRow(row)
      })
      Iodata_m6.K_VIO_DI.forEach((row) => {
        worksheetouts_vio[2].addRow(row)
      })
      Iodata_m6.K_VIO_DOV.forEach((row) => {
        worksheetouts_vio[3].addRow(row)
      })
    }
    // else {     //生成M7数据库
    // }
    // 向用户显示一个消息框
    // 保存文件
    await workbookout_k.xlsx.writeFile(pathfileIOoutdata_k)
    await workbookout_vio.xlsx.writeFile(pathfileIOoutdata_vio)
    await dialog.showMessageBox({
      type: 'info',
      title: '信息',
      message: '数据库已生成' // 添加安全访问
    })
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `生成数据库出错:${(err as Error).message}`
    })
  }
}
// 生成接线表
export async function hollysysIOjxb(): Promise<void> {
  try {
    // 定义路径
    const pathfile = join(global.globalpaths[0], '设计')
    const pathfileIO = join(pathfile, 'IO清单.xlsm')
    const pathfileIOout = join(pathfile, 'IO清单输出')
    const pathfileIOoutjxb = join(pathfileIOout, 'IO接线表.xlsx')
    const workbook = new ExcelJS.Workbook()
    // 读取 Excel 文件
    await workbook.xlsx.readFile(pathfileIO)
    // 获取 "IO清单" 工作表
    const worksheet = workbook.worksheets.find((ws) => ws.name === 'IO清单')
    if (!worksheet) {
      console.error('工作表 "IO清单" 不存在')
      return
    }
    // 收集工作表数据
    const data: string[][] = []
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber < 2) return // 跳过第 1 行
      const rowData: string[] = []
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (
          colNumber == 1 ||
          colNumber == 7 ||
          colNumber == 8 ||
          colNumber == 17 ||
          colNumber == 24 ||
          colNumber == 25 ||
          colNumber == 26 ||
          colNumber == 27 ||
          colNumber == 42 ||
          colNumber == 43 ||
          colNumber == 44 ||
          colNumber == 45 ||
          colNumber == 46 ||
          colNumber == 47 ||
          colNumber == 48
        )
          rowData.push(cell.text) // 提取单元格文本内容
      })
      data.push(rowData)
    })
    // 创建新工作簿
    const workbookout = new ExcelJS.Workbook()
    const worksheetout = workbookout.addWorksheet('接线表')
    // 写入数据
    data.forEach((row) => {
      worksheetout.addRow(row)
    })
    // 可选：设置列宽（根据数据长度自动调整）
    worksheetout.columns.forEach((column, index) => {
      // const lengths = data.map((row) => (row[index] ? row[index].length : 0))
      // 获取当前列所有单元格内容长度
      const lengths = data.map((row) => row[index]?.toString().length || 0)
      const maxLength = Math.max(8, ...lengths)
      column.width = maxLength
    })
    // 为所有数据单元格添加边框
    worksheetout.eachRow({ includeEmpty: true }, (row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } }
        }
      })
    })
    // 保存文件
    await workbookout.xlsx.writeFile(pathfileIOoutjxb)
    // console.log('IO清单内容:')
    // data.forEach((row) => {
    //   console.log(row)
    // })
    // 向用户显示一个消息框
    await dialog.showMessageBox({
      type: 'info',
      title: '信息',
      message: '接线表已成' // 添加安全访问
    })
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: `生成接线表出错:${(err as Error).message}`
    })
  }
}

//M6数据库数据整理
function Ioto_data_m6(data: string[][]): IOdataList {
  const Iodata_m6: IOdataList = {
    AI: [
      [
        'PN', 'DS', 'SN', 'MT', 'DN', 'CN', 'MU', 'MD', 'UT', 'OF', 'SIGTYPE', 'AH', 'H1', 'AL', 'L1', 'HH', 'H2', 'LL', 'L2', 'HISCP', 'RD'
      ],
      [
        '点名', '点描述', '站号', '模块类型', '模块地址', '通道号', '量程上限', '量程下限', '单位', '显示格式', '信号类型', '报警高限', '高限报警级', '报警低限', '低限报警级', '报警高高限', '高高限报警级', '报警低低限', '低低限报警级', '采集周期', '是否冗余'
      ]
    ],
    AO: [
      [
        'PN', 'DS', 'SN', 'MT', 'DN', 'CN', 'MU', 'MD', 'UT', 'OF', 'HISCP', 'OUTU', 'OUTL', 'RD'
      ],
      [
        '点名', '点描述', '站号', '模块类型', '模块地址', '通道号', '量程上限', '量程下限', '单位', '显示格式', '采集周期', '输出设定上限', '输出设定下限', '是否冗余'
      ]
    ],
    DI: [
      [
        'PN', 'DS', 'SN', 'MT', 'DN', 'CN', 'E0', 'E1', 'DAMOPT', 'DAMLV', 'RD'
      ],
      [
        '点名', '点描述', '站号', '模块类型', '模块地址', '通道号', '置0说明', '置1说明', '报警属性', '报警级', '是否冗余'
      ]
    ],
    DOV: [
      [
        'PN', 'DS', 'SN', 'MT', 'DN', 'CN', 'E0', 'E1', 'DAMOPT', 'DAMLV', 'RD'
      ],
      [
        '点名', '点描述', '站号', '模块类型', '模块地址', '通道号', '置0说明', '置1说明', '报警属性', '报警级', '是否冗余'
      ]
    ],
    K_VIO_AI: [
      [
        'PN', 'DS', 'LOC_DS', 'SN', 'IO_LPS', 'GW_TYPE', 'GW_DN', 'GW_LPS', 'MT', 'DN', 'CN', 'KKS', 'MU', 'MD', 'UT', 'OF', 'SIGTYPE', 'AH', 'H1', 'AL', 'L1', 'HH', 'H2', 'LL', 'L2', 'ALMDB', 'ADLY', 'RATIO', 'RATLV', 'DAL', 'DALPLV', 'DALNLV', 'DALDB', 'OUTSP', 'DALTYPE', 'INHLIM', 'INHH2', 'INHH1', 'INHL1', 'INHL2', 'INHRAT', 'INHDAL', 'INHDALP', 'INHDALN', 'HISCP', 'HISTP', 'FTROPT', 'FTRCOF', 'SQRTOPT', 'ECTCUTO', 'ECTCUTV', 'ENGCUTO', 'ENGCUTV', 'SUBOPT', 'MANSUB', 'SUBVAL', 'REVOPT', 'AREANO', 'TN', 'BENGCAL', 'VA', 'NET', 'BIAS', 'IN', 'RALOUT', 'AV', 'AM', 'Q', 'REDSTA', 'PNLOPT', 'ALMOPT', 'RD', 'GW', 'VIO_2', 'VIO_3', 'VIO_4'
      ],
      [
        '点名', '点描述', '系统所使用语言的点描述', '站号', 'IO所属链路', '网关类型', '网关站号', '网关所属链路', '模块类型', '模块地址', '通道号', 'KKS编码', '量程上限', '量程下限', '单位', '显示格式', '信号类型', '报警高限', '高限报警级', '报警低限', '低限报警级', '报警高高限', '高高限报警级', '报警低低限', '低低限报警级', '限值报警死区', '报警恢复延时时间', '速率报警限', '速率报警级', '偏差报警限', '正偏差报警级', '负偏差报警级', '偏差报警限死区', '输出设定值', '偏差报警类型', '限值报警抑制', '高高限报警抑制', '高限报警抑制', '低限报警抑制', '低低限报警抑制', '速率报警抑制', '偏差报警抑制', '正偏差报警抑制', '负偏差报警抑制', '采集周期', '采集方式', '滤波', '滤波时间', '是否开方', '开方小信号切除', '开方小信号切除限', '工程量小信号切除', '工程量小信号切除限', '是否替代', '替代模式', '替代值', '反量程属性', '区域', '端子编号', '工程计算属性', '声音报警', '是否上网', '偏置项', '模块采集值', '工程量采集值', '当前值', '工艺报警状态', '质量位', '信号来源', '操作面板选择', '工艺报警开关', '是否冗余', '网关接线方式', '工频抑制', '通道状态', '接线方式'
      ]
    ],
    K_VIO_AO: [
      [
        'PN', 'DS', 'SN', 'MT', 'DN', 'CN', 'MU', 'MD', 'UT', 'OF', 'HISCP', 'OUTU', 'OUTL', 'RD'
      ],
      [
        '点名', '点描述', '站号', '模块类型', '模块地址', '通道号', '量程上限', '量程下限', '单位', '显示格式', '采集周期', '输出设定上限', '输出设定下限', '是否冗余'
      ]
    ],
    K_VIO_DI: [
      [
        'PN', 'DS', 'LOC_DS', 'SN', 'IO_LPS', 'GW_TYPE', 'GW_DN', 'GW_LPS', 'MT', 'DN', 'CN', 'KKS', 'E0', 'E1', 'DAMOPT', 'DAMLV', 'INHDAM', 'SVROPT', 'SVR', 'SVRRST', 'SUBOPT', 'MANSUB', 'SUBVAL', 'REVOPT', 'AREANO', 'TN', 'BENGCAL', 'VA', 'NET', 'DI', 'DV', 'Q', 'REDSTA', 'DAM', 'PNLOPT', 'ALMOPT', 'BHDBOPT', 'SOEEN', 'MODESOE', 'RD', 'GW', 'VIO_15'
      ],
      [
        '点名', '点描述', '系统所使用语言的点描述', '站号', 'IO所属链路', '网关类型', '网关站号', '网关所属链路', '模块类型', '模块地址', '通道号', 'KKS编码', '置0说明', '置1说明', '报警属性', '报警级', '报警抑制', '是否判别抖动', '抖动时间长度', '消抖时间长度', '是否替代', '替代模式', '替代值', '反量程属性', '区域', '端子编号', '工程计算属性', '声音报警', '是否上网', '输入值', '当前值', '质量位', '信号来源', '报警指示', '操作面板选择', '工艺报警开关', '开关量是否进历史库', 'SOE使能', '模块SOE使能', '是否冗余', '网关接线方式', '输入信号类型选择'
      ]
    ],
    K_VIO_DOV: [
      [
        'PN', 'DS', 'LOC_DS', 'SN', 'IO_LPS', 'GW_TYPE', 'GW_DN', 'GW_LPS', 'MT', 'DN', 'CN', 'KKS', 'E0', 'E1', 'REVOPT', 'AREANO', 'TN', 'BENGCAL', 'NET', 'DI', 'DV', 'Q', 'REDSTA', 'PNLOPT', 'DAMOPT', 'DAMLV', 'INHDAM', 'DAM', 'VA', 'ALMOPT', 'BHDBOPT', 'SOEEN', 'RD', 'GW', 'VIO_24', 'VIO_25', 'VIO_255', 'VIO_26', 'VIO_27', 'VIO_28'
      ],
      [
        '点名', '点描述', '系统所使用语言的点描述', '站号', 'IO所属链路', '网关类型', '网关站号', '网关所属链路', '模块类型', '模块地址', '通道号', 'KKS编码', '置0说明', '置1说明', '反量程属性', '区域', '端子编号', '工程计算属性', '是否上网', '输入值', '当前值', '质量位', '信号来源', '操作面板选择', '报警属性', '报警级', '报警抑制', '报警指示', '声音报警', '工艺报警开关', '开关量是否进历史库', 'SOE使能', '是否冗余', '网关接线方式', '通道状态', '通道诊断', '信号范围', '通道故障输出模式', '通道安全预设值', '通道触点类型'
      ]
    ]
  }
  for (let i = 0; i < data.length; i++) {
    switch (data[i][10]){
      case 'AI': {
        let IO_OF:string ='%-8.2f'
        if ((Number(data[i][3])-Number(data[i][2]))/1000.0 > 1){
          IO_OF = '%-8.f'
        } else if ((Number(data[i][3])-Number(data[i][2]))/100.0 > 1){
          IO_OF = '%-8.1f'
        } else if ((Number(data[i][3])-Number(data[i][2]))/10.0 > 1){
          IO_OF = '%-8.2f'
        } else if ((Number(data[i][3])-Number(data[i][2]))/1.0 > 1){
          IO_OF = '%-8.3f'
        } else {
          IO_OF = '%-8.4f'
        }
        if (data[i][20].includes('VIO')) {
          Iodata_m6.K_VIO_AI.push([data[i][0], data[i][1], '', Number(data[i][17]), 0, '', '', '', 
            data[i][20], Number(data[i][18]), Number(data[i][19]), '', Number(data[i][3]), Number(data[i][2]), data[i][4], IO_OF, 'S4_20mA', 
            data[i][5] === '' ? 0:Number(data[i][5]), (data[i][5] === '' || data[i][5] === '0') ? 0 : 1, 
            data[i][7] === '' ? 0:Number(data[i][7]), (data[i][7] === '' || data[i][7] === '0') ? 0 : 1, 
            data[i][6] === '' ? 0:Number(data[i][6]), (data[i][6] === '' || data[i][6] === '0') ? 0 : 2, 
            data[i][8] === '' ? 0:Number(data[i][8]), (data[i][8] === '' || data[i][8] === '0') ? 0 : 2,
            2, 2, 5, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
            '00:00:01', 0, 0, 0, 0, 1, 2, 0, 2, 1, 0, 0, 0, 0, '', 0, '', 
            0, 0, 0, 0, 0, 0, 0, 0, '', 1, 
            data[i][14] === '是' ? 1 : 0, 0, 0, 2, 
            data[i][12] === '4Wire' ? 1 : 0])
        } else {
          Iodata_m6.AI.push([data[i][0], data[i][1], Number(data[i][17]), data[i][20], Number(data[i][18]), Number(data[i][19]), 
            Number(data[i][3]), Number(data[i][2]), data[i][4], IO_OF, 'S4_20mA', 
            data[i][5] === '' ? 0:Number(data[i][5]), (data[i][5] === '' || data[i][5] === '0') ? 0 : 1, 
            data[i][7] === '' ? 0:Number(data[i][7]), (data[i][7] === '' || data[i][7] === '0') ? 0 : 1, 
            data[i][6] === '' ? 0:Number(data[i][6]), (data[i][6] === '' || data[i][6] === '0') ? 0 : 2, 
            data[i][8] === '' ? 0:Number(data[i][8]), (data[i][8] === '' || data[i][8] === '0') ? 0 : 2,
            '00:00:01', data[i][14] === '是' ? 1 : 0])
        }
      }
      break
      case 'AO': {
        if (data[i][20].includes('VIO')) {
          Iodata_m6.K_VIO_AO.push([data[i][0], data[i][1], Number(data[i][17]), data[i][20], Number(data[i][18]), Number(data[i][19]), 
            Number(data[i][3]), Number(data[i][2]), data[i][4], '%-8.2f', '00:00:01', Number(data[i][3]), Number(data[i][2]), 
            data[i][14] === '是' ? 1 : 0])
        } else {
          Iodata_m6.AO.push([data[i][0], data[i][1], Number(data[i][17]), data[i][20], Number(data[i][18]), Number(data[i][19]), 
            Number(data[i][3]), Number(data[i][2]), data[i][4], '%-8.2f', '00:00:01', Number(data[i][3]), Number(data[i][2]), 
            data[i][14] === '是' ? 1 : 0])
        }
      }
      break
      case 'DI': {
        if (data[i][20].includes('VIO')) {
          if (data[i][11] === '湿接点') {
            Iodata_m6.K_VIO_DI.push([data[i][0], data[i][1], '', Number(data[i][17]), 0, '', '', '', 
              data[i][20], Number(data[i][18]), Number(data[i][19]), '', data[i][2], data[i][3], 
              data[i][9] === '' ? 0:Number(data[i][9]), Number(data[i][9])>0 ? 2 : 0, 
              0, 1, 2, 5, 1, 0, 0, 0, 0, '', 0, '', 0, 0, 0, 0, 0, 0, '', 
              1, 1, 0, 0, data[i][14] === '是' ? 1 : 0, 0, 1])
          } else if (data[i][11] === 'Namur') {
            Iodata_m6.K_VIO_DI.push([data[i][0], data[i][1], '', Number(data[i][17]), 0, '', '', '', 
              data[i][20], Number(data[i][18]), Number(data[i][19]), '', data[i][2], data[i][3], 
              data[i][9] === '' ? 0:Number(data[i][9]), Number(data[i][9])>0 ? 2 : 0, 
              0, 1, 2, 5, 1, 0, 0, 0, 0, '', 0, '', 0, 0, 0, 0, 0, 0, '', 
              1, 1, 0, 0, data[i][14] === '是' ? 1 : 0, 0, 2])
          } else {
            Iodata_m6.K_VIO_DI.push([data[i][0], data[i][1], '', Number(data[i][17]), 0, '', '', '', 
              data[i][20], Number(data[i][18]), Number(data[i][19]), '', data[i][2], data[i][3], 
              data[i][9] === '' ? 0:Number(data[i][9]), Number(data[i][9])>0 ? 2 : 0, 
              0, 1, 2, 5, 1, 0, 0, 0, 0, '', 0, '', 0, 0, 0, 0, 0, 0, '', 
              1, 1, 0, 0, data[i][14] === '是' ? 1 : 0, 0, 0])
          }
        } else {
          Iodata_m6.DI.push([data[i][0], data[i][1], Number(data[i][17]), data[i][20], Number(data[i][18]), Number(data[i][19]),  
            data[i][2], data[i][3], 
            data[i][9] === '' ? 0:Number(data[i][9]), Number(data[i][9])>0 ? 2 : 0, 
            data[i][14] === '是' ? 1 : 0])
        }
      }
      break
      case 'DO': {
        if (data[i][20].includes('VIO')) {
          Iodata_m6.K_VIO_DOV.push([data[i][0], data[i][1], '', Number(data[i][17]), 0, '', '', '', 
            data[i][20], Number(data[i][18]), Number(data[i][19]), '', data[i][2], data[i][3], 0, 0, '', 
            0, 0, 0, 0, 0, 0, '', 
            data[i][9] === '' ? 0:Number(data[i][9]), Number(data[i][9])>0 ? 2 : 0, 
            0, 0, '', 1, 1, 0, data[i][14] === '是' ? 1 : 0, 
            0, 1, data[i][11] === '湿接点' ? 1 : 0, 
            1, 0, 0, data[i][11] === '湿接点' ? 0 : 1])
        } else {
          Iodata_m6.DOV.push([data[i][0], data[i][1], Number(data[i][17]), data[i][20], Number(data[i][18]), Number(data[i][19]), 
            data[i][2], data[i][3], 
            data[i][9] === '' ? 0:Number(data[i][9]), Number(data[i][9])>0 ? 2 : 0, 
            data[i][14] === '是' ? 1 : 0])
        }
      }
      break
      default:
      break
    }
  }
  return Iodata_m6
}
