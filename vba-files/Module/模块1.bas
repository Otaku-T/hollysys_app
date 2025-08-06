Attribute VB_Name = "模块1"
Sub sum_Click()
    Dim ws As Worksheet
    Dim wsMain As Worksheet
    Dim headerRows As Integer
    Dim lastRow As Long
    Dim i As Integer
    Dim sheetsToDelete As Collection
    Set sheetsToDelete = New Collection
    
    ' 获取表头行数
    headerRows = InputBox("请输入表头行数：", "表头行数", 1)
    
    ' 设置主工作表为首页后的第一个工作表
    Set wsMain = ThisWorkbook.Sheets(2)
    
    ' 清除主工作表中除表头外的所有数据
    ' wsMain.Rows(headerRows + 1 & ":" & wsMain.Rows.Count).ClearContents
    
    ' 遍历所有工作表
    For Each ws In ThisWorkbook.Sheets
        ' 跳过首页和主工作表
        If ws.Index <> 1 And ws.Index <> wsMain.Index Then
            ' 获取当前工作表的最后一行
            lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
            
            ' 将数据复制到主工作表有数据的最后一行
            ws.Rows(headerRows + 1 & ":" & lastRow).Copy Destination:=wsMain.Cells(wsMain.Rows.Count, 1).End(xlUp).Offset(1, 0)
            
            ' 将要删除的工作表添加到集合中
            sheetsToDelete.Add ws
        End If
    Next ws
    
    ' 删除被合并的工作表
    For i = sheetsToDelete.Count To 1 Step -1
        Application.DisplayAlerts = False
        sheetsToDelete(i).Delete
        Application.DisplayAlerts = True
    Next i
    
    MsgBox "合并完成！", vbInformation
End Sub
