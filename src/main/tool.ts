import { dialog, BrowserWindow } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { join, dirname, basename } from 'path'
import ExcelJS from 'exceljs'
import fs from 'fs'

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
