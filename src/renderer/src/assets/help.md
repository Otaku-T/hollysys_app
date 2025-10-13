## 简介
该软件是一款为工程项目提供便捷实施的工具。

## 主要功能
- **招标**：初版BOM表设计时建立相关物质的拓扑关系。
- **设计**：项目的硬件设计、整机设计、网络设计。
- **组态**：逻辑组态、图形组态。
- **工具**：工程过程中的小工具。
- <img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\登录界面.png" alt="登录界面" style="zoom:50%;" />
- <img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\主界面.png" alt="主界面" style="zoom:50%;" />


## 使用方法

### 新建工程
1. 点击工作目录按钮一个空的文件夹。
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\工作目录.png" alt="工作目录" style="zoom:100%;" />
2. 点击新建工程按钮，新建成功后会有提示
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\新建工程.png" alt="新建工程" style="zoom:100%;" />

### 招标
1. 暂时未启动。

### 设计

#### IO清单：
1.设计页面的功能大多数都要用到IO清单.xlsm文件，需要先填写这个文件
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\IO清单.png" alt="IO清单" style="zoom:100%;" />
2.根据"首页"的使用说明填写"机柜布置"工作表，修改"IO接线"工作表的信号类型与接线端子
3.填写"IO清单"工作表
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\IO清单使用.png" alt="IO清单使用" style="zoom:100%;" />
4.其他列，再点击保存是时候会自动根据"机柜布置"工作表、"IO接线"工作表填写

#### 数据库：

1. IO清单.xlsm 文件不能更改名字
2. IO清单中的IO信息和系统柜/拓展柜对应的几列必须填写
3. 点击按钮，程序会根据IO清单生成IO清单对应的IO数据库
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\数据库.png" alt="数据库" style="zoom:100%;" />
4. 工程总控制中添加对应的机柜和IOTU柜
5. 添加编辑对的模块地址
6. AI\AO\DI\DO\VIO的模块类型不用添加、导入数据库能能自动生成
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\添加地址.png" alt="添加地址" style="zoom:100%;" />

#### 接线表：
1. IO清单.xlsm 文件不能更改名字
2. IO清单中的接线柜对应的几列必须填写
3. 点击按钮，程序会根据IO清单生成IO清单对应的接线柜
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\接线表.png" alt="接线表" style="zoom:100%;" />

#### FAT文件：

#### 机柜布置：

#### 联调文件：


### 组态
#### 数据分类：
0. 原理：将点名拆分为站号、单元号、仪表类型、位号。然后进行组合，将编号相同的分配到同一组
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\数据分类表.png" alt="数据分类表" style="zoom:100%;" />
1. 将生成的数据库表格重命名为"数据库.xlsx"
2. 点击数据分类按钮，提示成功后会生成一个"数据分类.xlsx"文件
3. 打开"数据分类.xlsx"文件，可以筛选基本回路
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\数据分类.png" alt="数据分类" style="zoom:100%;" />

#### 更新表格：
0. 原理：M6M7的POU文件导出后都是可读的XML文件，M7的画面导出后也是刻度的json文件。可以对文件进行解析，读取相应的数据。
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\读取原理.png" alt="读取原理" style="zoom:100%;" />
1. 更新表格功能会读取"典型回路输入" "POU替换输入" "画面修改输入"下的文件
2. 组态的文件包获XML文件、画面文件为MGP7(M7)文件
3. 点击按钮后或根据对应目录下的文件生成"典型回路.xlsx" "点名替换.xlsx" "画面修改.xlsx"
4. 若文件夹下无文件，会弹窗提示
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\更新表格.png" alt="更新表格" style="zoom:100%;" />

#### 生成回路：
1. 打开更新表格生成的"典型回路.xlsx"
2. 每个工作表对应的一个典型回路
3. 根据表格按行填写
4. 空行代表POU分页
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\生成回路.png" alt="生成回路" style="zoom:100%;" />

#### 读写替换表：
1.要先生成点名替换.xlsx文件
2.点击按钮选择读取生成点名替换对应表
3.根据POU总所有的点名，填写对应的点名（可以填写多列）
4.点击按钮选择回填点名替换，（填写多列就回填多列）
5.回填后检查点名替换.xlsx文件，无误后点解替换POU按钮
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\点名对应.png" alt="点名对应" style="zoom:100%;" />

#### 替换POU：
1. 打开更新表格生成的"点名替换.xlsx"
2. 每个工作表对应的一个POU
3. 根据表格按列填写
4. 每一列代表一个新的POU
5. 可以生成新POU名，也可保留POU名
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\替换POU.png" alt="替换POU" style="zoom:100%;" />

#### POU变量表：
1. 读取''POU点名统计"文件夹下的所有POU
2. 生成"点名统计.xlsx"，可以用来统计点名
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\点名统计.png" alt="点名统计" style="zoom:100%;" />

#### 生成ST：
1. 打开新建工程生成的"ST框架.xlsx"
2. 在表格内填写对应框架
3. 点击生成ST，生成的顺控文件在ST顺控文件下
4. 需要配合ST变量表读取变量导入数据库
5. 生成的文件是文本文件，需要复制粘贴到POU中
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\生成ST.png" style="zoom:100%;" />

#### ST变量表：
1. 读取''ST顺控"文件夹下的所有ST文件
2. 将文件中所有符合要求的字符串提取出来生成"ST变量表.xlsx"
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\ST变量表.png" alt="ST变量表" style="zoom:100%;" />

#### 替换ST：
1. 使用替换ST，前必须先更新ST变量表
2. 根据"ST变量表.xlsx"对ST顺控文件夹下的顺控进行替换
3. 替换后的文件在ST替换输出文件夹下
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\替换ST.png" alt="替换ST" style="zoom:100%;" />

#### 修改画面：
1. 刚开头
#### 生成画面：
1. 暂时未启动
#### 回路生成exe：
1. 点击后会调用exe软件
2. 软件打开后创建工作簿
3. 打开生成的工作簿，根据使用说明工作表填写
4. 点击相应按钮，生成文件
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\回路exe.png" alt="回路exe" style="zoom:100%;" />

#### 备份：
1. 每次更新表格都会将旧表格覆盖
2. 备份功能将组态文件夹下的XLSX文件复制到备份文件夹下
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\备份.png" alt="备份" style="zoom:100%;" />

### 工具
#### PDF处理：
1. 需要联网使用
2. 跳转的网页 https://tools.pdf24.org/zh/all-tools
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\PDF工具.png" alt="PDF工具" style="zoom:100%;" />

#### EXCEL合并：
1. 填写表头行数，合并时跳过表头
2. 填写首页页数，不合并首页
3. 点击合并按钮，选择需要合并的Excel的文件

#### EXCEL拆分：
1. 填写表头行数，拆分时跳过表头
2. 点击拆分按钮，生成的文件在out文件夹下

#### OPS截屏：
1. OPS画面放在第一页
2. 输入截图数量和间隔时间
3. 选择下一页坐标
4. 选择截图保存路径

#### 更新：
1. 用的是个人仓库(个人不登录无法访问)
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\更新.png" alt="更新" style="zoom:100%;" />

#### OPC UA：
1. 未启动

#### IPV4 TO IPV6：
1. 未启动

#### WIN常用指令：
<img src="D:\00000\VUE3\hollysys_app\src\renderer\src\assets\img\指令.png" alt="指令" style="zoom:100%;" />

## 贡献者
- 作者：红烧肉。
- 联系方式：钉钉-张文超
- 帮助：邵文晴、刘锴、巴剑飞、常科、冯永祥、张蕾、孙万鹏、任东旺、潘博、常科龙

## 更新
- 版本：2.1.3 。
- 日期：2025.05.24
- 内容：
1. 修复ST顺控分支名相同时，多次生成的问题
2. 调整了框架ST变量顺序，能更好的复制到数据库
3. 添加POU替换时同名替换功能
4. 优化典型回路填写点名时需要添加后缀的问题

- 版本：2.2.1 。
- 日期：2025.06.01
- 内容：
1. 集成excel表格合并功能
2. 集成excel表格拆分功能
3. 集成OPS截图功能
4. 解决ST框架两次运行问题
5. 添加联网软件更新

- 版本：2.2.2 。
- 日期：2025.06.30
- 内容：
1. 修复excel表格合并时公式出错问题
2. 修改附件exe文件
3. 修改设计框架
4. 给POU点名统计添加类型列

- 版本：2.2.3 。
- 日期：2025.08.28
- 内容：
1. 修复典型回路中有数字时无法生成的BUG
2. 添加双击EXCEL表格是自动打开功能
3. 添加固定回路生成软件exe(生成的文件只能M6使用)
4. 添加IO清单工作表
5. 添加生成M6数据库表格功能、
6. 添加生成接线表功能
7. 添加双击目录自动打开文件夹功能

- 版本：2.2.4 。
- 日期：2025.09.15
- 内容：
1.优化IO清单工作表，数据量过大时卡顿问题
2.修复功能块只有一个引脚时无法连接问题
3.OPS截屏功能优化
4.修复数据库通道不使能问题
5.添加大批量POU替换时，统一修改点名功能（读写替换表）
6.M7的POU修改功能因M7软件更新暂时不能使用

- 版本：2.2.5 。
- 日期：2025.10.15
- 内容：
1. 帮助说明添加图片
2. 修复编辑框多余标签BUG
3. 添加WIN常用指令
1. 添加M7的读画面功能