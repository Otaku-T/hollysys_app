// 定义一个接口，用于限制person对象的具体属性
export interface DirectoryNode {
  path: string
  name: string
  kind: 'file' | 'directory'
  children?: DirectoryNode[]
  expanded?: boolean // 新增展开状态
}
export interface TabsNode {
  id: number
  path: string[]
  name: string[]
  text: string[]
  save: boolean[] // 时候保存
  editItem: string[]
}
