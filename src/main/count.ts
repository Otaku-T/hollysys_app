// 将EXCEL输入框的输入id字符串转换为二维数组，用于典型回路
export function unflattenInputidx(
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

//* 转置二维数组（行列互换）* @param matrix 输入的二维数组* @returns 转置后的新二维数组
export function transpose(data: string[][]): string[][] {
  if (data.length === 0) return []
  const transposed: string[][] = []
  for (let i = 0; i < data[0].length; i++) {
    transposed[i] = []
    for (let j = 0; j < data.length; j++) {
      transposed[i][j] = data[j][i]
    }
  }
  return transposed
}

//* 将二维数组根据第一列的值进行分组，形成三维数组* @param data 二维数组* @returns 三维数组，每个子数组包含具有相同第一列值的行
export function groupByFirstColumn(data: string[][]): string[][][] {
  // 按原始数据中第一列值的出现顺序返回分组
  const result: string[][][] = []
  const page: string[] = []
  for (let i = 1; i < data.length; i++) {
    if (data[i].length < 5) continue // 跳过空行
    const index = page.indexOf(data[i][0])
    if (index === -1) {
      page.push(data[i][0])
    }
  }
  // console.log(page)
  for (let i = 0; i < page.length; i++) {
    result.push([])
    for (let j = 1; j < data.length; j++) {
      if (data[j].length < 5) continue // 跳过空行
      if (data[j][0] === page[i]) {
        result[i].push(data[j])
      }
    }
  }
  // console.log(result)
  return result
}

//* 合并二维数组中第一列相同的行，特别合并第二列* @param data 二维字符串数组* @returns 合并后的新二维数组
export function mergeRowsByFirst(data: string[][]): string[][] {
  const resultMap = new Map<string, { secondColumnValues: string[]; otherColumns: string[] }>()
  for (const row of data) {
    if (row.length === 0) continue
    const key = row[0]
    const secondColumn = row.length > 1 ? row[1] : ''
    const otherColumns = row.length > 2 ? row.slice(2) : []
    if (!resultMap.has(key)) {
      resultMap.set(key, {
        secondColumnValues: [],
        otherColumns: otherColumns
      })
    }
    const entry = resultMap.get(key)!
    if (secondColumn !== '') {
      entry.secondColumnValues.push(secondColumn)
    }
  }
  // 生成结果数组
  return Array.from(resultMap, ([key, entry]) => {
    return [key, entry.secondColumnValues.join(','), ...entry.otherColumns]
  })
}
