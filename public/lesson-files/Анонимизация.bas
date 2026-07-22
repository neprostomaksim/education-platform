Attribute VB_Name = "Анонимизация"
'==========================================================================
'  ОБЕЗЛИЧИВАНИЕ ДАННЫХ  (М1)
'  Обезличить — значения выделенного диапазона -> токены, карта на лист «Карта_замен».
'  ВернутьДанные — токены обратно в оригиналы (напр. в ответе нейросети).
'  ⚠️ Лист «Карта_замен» в нейросеть НЕ загружать.
'==========================================================================
Option Explicit

Sub Обезличить()
    Dim rng As Range, cell As Range, mapSheet As Worksheet
    Dim dict As Object, prefix As String, token As String
    Dim counter As Long, lastMapRow As Long, val As String

    If TypeName(Selection) <> "Range" Then
        MsgBox "Выделите диапазон ячеек для обезличивания.", vbExclamation: Exit Sub
    End If
    Set rng = Selection

    prefix = InputBox("Префикс токена (напр. КОМПАНИЯ, ФИО, СЧЁТ):", "Обезличивание", "ОБ")
    If prefix = "" Then Exit Sub

    Set dict = CreateObject("Scripting.Dictionary")
    Set mapSheet = ПолучитьЛистКарты()
    lastMapRow = mapSheet.Cells(mapSheet.Rows.Count, 1).End(xlUp).Row
    counter = 1

    For Each cell In rng.Cells
        val = Trim(CStr(cell.Value))
        If val <> "" Then
            If Not dict.Exists(val) Then
                token = prefix & "_" & Format(counter, "000")
                dict.Add val, token
                counter = counter + 1
                lastMapRow = lastMapRow + 1
                mapSheet.Cells(lastMapRow, 1).Value = token
                mapSheet.Cells(lastMapRow, 2).Value = val
            End If
            cell.Value = dict(val)
        End If
    Next cell

    MsgBox "Обезличено уникальных значений: " & dict.Count & vbCrLf & _
           "Карта — на листе «Карта_замен». НЕ загружайте её в нейросеть!", vbInformation
End Sub

Sub ВернутьДанные()
    Dim rng As Range, cell As Range, mapSheet As Worksheet
    Dim dict As Object, i As Long, lastRow As Long, key As Variant

    If TypeName(Selection) <> "Range" Then
        MsgBox "Выделите диапазон с токенами.", vbExclamation: Exit Sub
    End If
    Set rng = Selection

    On Error Resume Next
    Set mapSheet = ThisWorkbook.Worksheets("Карта_замен")
    On Error GoTo 0
    If mapSheet Is Nothing Then MsgBox "Лист «Карта_замен» не найден.", vbExclamation: Exit Sub

    Set dict = CreateObject("Scripting.Dictionary")
    lastRow = mapSheet.Cells(mapSheet.Rows.Count, 1).End(xlUp).Row
    For i = 2 To lastRow
        dict(CStr(mapSheet.Cells(i, 1).Value)) = mapSheet.Cells(i, 2).Value
    Next i

    For Each cell In rng.Cells
        For Each key In dict.Keys
            If InStr(1, CStr(cell.Value), key) > 0 Then
                cell.Value = Replace(CStr(cell.Value), key, dict(key))
            End If
        Next key
    Next cell

    MsgBox "Данные возвращены по карте замен.", vbInformation
End Sub

Private Function ПолучитьЛистКарты() As Worksheet
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets("Карта_замен")
    On Error GoTo 0
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Worksheets.Add
        ws.Name = "Карта_замен"
        ws.Cells(1, 1).Value = "Токен": ws.Cells(1, 2).Value = "Оригинал"
    End If
    Set ПолучитьЛистКарты = ws
End Function
