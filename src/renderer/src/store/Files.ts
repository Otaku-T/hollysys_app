import { defineStore } from 'pinia'
import { type DirectoryNode, type TabsNode } from '../types'

export const useFilesStore = defineStore('files', {
  // actions里面放置的是一个一个的方法，用于响应组件中的“动作”
  actions: {
    updated(value: DirectoryNode[]) {
      // console.log('increment被调用了', value)
      this.files_tree_data = value
    }
  },
  // 真正存储数据的地方
  state(): { files_tree_data: DirectoryNode[] } {
    return {
      files_tree_data: []
    }
  }
})
export const useTabsStore = defineStore('tabs', {
  // actions里面放置的是一个一个的方法，用于响应组件中的“动作”
  actions: {
    addTab(name: string, text: string, path: string) {
      const index = this.files_tabs_data.name.indexOf(name)
      if (index === -1) {
        // console.log('increment被调用了', value)
        this.files_tabs_data.path.push(path)
        this.files_tabs_data.name.push(name)
        this.files_tabs_data.text.push(text)
        this.files_tabs_data.save.push(true)
        this.files_tabs_data.editItem.push(text)
      }
      // console.log('节点被点击,去主进程获取数据:', this.files_tabs_data.name)
      this.files_tabs_data.id = this.files_tabs_data.name.indexOf(name)
    },
    delete(name: string) {
      const index = this.files_tabs_data.name.indexOf(name)
      if (index !== -1) {
        // 删除元素前处理当前选中id
        if (this.files_tabs_data.id >= index) {
          this.files_tabs_data.id = Math.max(0, this.files_tabs_data.id - 1)
        }
        this.files_tabs_data.name.splice(index, 1)
        this.files_tabs_data.text.splice(index, 1)
        this.files_tabs_data.save.splice(index, 1)
        this.files_tabs_data.editItem.splice(index, 1)
        // console.log('节点ID:', this.files_tabs_data.id)
        // console.log('节点被删除:', this.files_tabs_data.name)
      }
    },
    setdate(name: string, text: string) {
      const index = this.files_tabs_data.name.indexOf(name)
      if (index !== -1) {
        this.files_tabs_data.id = index
      }
      if (this.files_tabs_data.text[index] !== text) {
        this.files_tabs_data.save[index] = false
        this.files_tabs_data.editItem[index] = text
        // console.log('修改', this.files_tabs_data.editItem[index])
      }
    },
    seltab(name: string) {
      const index = this.files_tabs_data.name.indexOf(name)
      if (index !== -1) {
        this.files_tabs_data.id = index
      }
    },
    savedate() {
      // console.log('发送给主进程', this.files_tabs_data.name[this.files_tabs_data.id])
      this.files_tabs_data.save[this.files_tabs_data.id] = true
    }
  },
  // 真正存储数据的地方
  state(): { files_tabs_data: TabsNode } {
    return {
      files_tabs_data: {
        id: 0,
        path: [],
        name: [],
        text: [],
        save: [],
        editItem: []
      }
    }
  }
})
