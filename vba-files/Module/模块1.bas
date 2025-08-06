Attribute VB_Name = "ģ��1"
Sub sum_Click()
    Dim ws As Worksheet
    Dim wsMain As Worksheet
    Dim headerRows As Integer
    Dim lastRow As Long
    Dim i As Integer
    Dim sheetsToDelete As Collection
    Set sheetsToDelete = New Collection
    
    ' ��ȡ��ͷ����
    headerRows = InputBox("�������ͷ������", "��ͷ����", 1)
    
    ' ������������Ϊ��ҳ��ĵ�һ��������
    Set wsMain = ThisWorkbook.Sheets(2)
    
    ' ������������г���ͷ�����������
    ' wsMain.Rows(headerRows + 1 & ":" & wsMain.Rows.Count).ClearContents
    
    ' �������й�����
    For Each ws In ThisWorkbook.Sheets
        ' ������ҳ����������
        If ws.Index <> 1 And ws.Index <> wsMain.Index Then
            ' ��ȡ��ǰ����������һ��
            lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
            
            ' �����ݸ��Ƶ��������������ݵ����һ��
            ws.Rows(headerRows + 1 & ":" & lastRow).Copy Destination:=wsMain.Cells(wsMain.Rows.Count, 1).End(xlUp).Offset(1, 0)
            
            ' ��Ҫɾ���Ĺ�������ӵ�������
            sheetsToDelete.Add ws
        End If
    Next ws
    
    ' ɾ�����ϲ��Ĺ�����
    For i = sheetsToDelete.Count To 1 Step -1
        Application.DisplayAlerts = False
        sheetsToDelete(i).Delete
        Application.DisplayAlerts = True
    Next i
    
    MsgBox "�ϲ���ɣ�", vbInformation
End Sub
