Attribute VB_Name = "Сверка_списков"
'==========================================================================
'  СВЕРКА ДВУХ СПИСКОВ  (наш учёт <-> акт сверки контрагента)
'  Листы «Наш_учет» и «Контрагент», формат: A Контрагент | B Документ(ключ) | C Сумма.
'  Ключ сопоставления — колонка B (номер документа).
'  Показывает: расхождение суммы, есть у нас/нет у них, есть у них/нет у нас.
'  Запуск: Alt+F8 -> Сверка_Списков.
'==========================================================================
Option Explicit
Private Const ДОПУСК As Double = 0.01   ' порог расхождения (правьте под задачу, напр. 1 руб.)

Public Sub Сверка_Списков()
    Dim ours As Object, theirs As Object
    Set ours = ЗагрузитьСписок("Наш_учет")
    Set theirs = ЗагрузитьСписок("Контрагент")
    If ours Is Nothing Or theirs Is Nothing Then Exit Sub

    Dim f As Worksheet: Set f = ПересоздатьЛист("Результат_сверки")
    f.Range("A1:F1").Value = Array("Документ", "Контрагент", "Тип", "Сумма у нас", "Сумма у них", "Расхождение")
    Dim fr As Long: fr = 2
    Dim совп As Long, расх As Long, нетУНих As Long, нетУНас As Long

    ' объединяем ключи
    Dim keys As Object: Set keys = CreateObject("Scripting.Dictionary")
    Dim k As Variant
    For Each k In ours.keys: keys(k) = True: Next k
    For Each k In theirs.keys: keys(k) = True: Next k

    For Each k In keys.keys
        Dim inO As Boolean, inT As Boolean
        inO = ours.Exists(k): inT = theirs.Exists(k)
        If inO And inT Then
            Dim sO As Double, sT As Double
            sO = ours(k)(1): sT = theirs(k)(1)
            If Abs(sO - sT) > ДОПУСК Then
                f.Cells(fr, 1).Value = k: f.Cells(fr, 2).Value = ours(k)(0)
                f.Cells(fr, 3).Value = "Расхождение суммы"
                f.Cells(fr, 4).Value = sO: f.Cells(fr, 5).Value = sT
                f.Cells(fr, 6).Value = sO - sT: fr = fr + 1: расх = расх + 1
            Else
                совп = совп + 1
            End If
        ElseIf inO Then
            f.Cells(fr, 1).Value = k: f.Cells(fr, 2).Value = ours(k)(0)
            f.Cells(fr, 3).Value = "Есть у нас, нет у контрагента"
            f.Cells(fr, 4).Value = ours(k)(1): fr = fr + 1: нетУНих = нетУНих + 1
        Else
            f.Cells(fr, 1).Value = k: f.Cells(fr, 2).Value = theirs(k)(0)
            f.Cells(fr, 3).Value = "Есть у контрагента, нет у нас"
            f.Cells(fr, 5).Value = theirs(k)(1): fr = fr + 1: нетУНас = нетУНас + 1
        End If
    Next k

    With f.Range("A1:F1")
        .Font.Bold = True: .Font.Color = vbWhite: .Interior.Color = RGB(79, 45, 127)
    End With
    f.Columns.AutoFit
    On Error Resume Next
    f.Rows("1:1").AutoFilter
    On Error GoTo 0
    f.Activate
    MsgBox "Совпало: " & совп & vbCrLf & "Расхождений суммы: " & расх & vbCrLf & _
           "Есть у нас, нет у них: " & нетУНих & vbCrLf & _
           "Есть у них, нет у нас: " & нетУНас, vbInformation, "Результат сверки"
End Sub

Private Function ЗагрузитьСписок(имяЛиста As String) As Object
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = Worksheets(имяЛиста)
    On Error GoTo 0
    If ws Is Nothing Then MsgBox "Не найден лист «" & имяЛиста & "».", vbCritical: Exit Function
    Dim d As Object: Set d = CreateObject("Scripting.Dictionary")
    Dim last As Long, r As Long
    last = ws.Cells(ws.Rows.Count, 2).End(xlUp).Row
    For r = 2 To last
        Dim key As String: key = Trim(CStr(ws.Cells(r, 2).Value))
        If key <> "" Then
            Dim sum As Double: sum = 0
            If IsNumeric(ws.Cells(r, 3).Value) Then sum = CDbl(ws.Cells(r, 3).Value)
            ' если ключ повторяется — суммируем
            If d.Exists(key) Then
                d(key) = Array(ws.Cells(r, 1).Value, d(key)(1) + sum)
            Else
                d(key) = Array(ws.Cells(r, 1).Value, sum)
            End If
        End If
    Next r
    Set ЗагрузитьСписок = d
End Function

Private Function ПересоздатьЛист(имя As String) As Worksheet
    Application.DisplayAlerts = False
    On Error Resume Next
    Worksheets(имя).Delete
    On Error GoTo 0
    Application.DisplayAlerts = True
    Dim ws As Worksheet: Set ws = Worksheets.Add: ws.Name = имя
    Set ПересоздатьЛист = ws
End Function
