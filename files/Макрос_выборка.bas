Attribute VB_Name = "Аудиторская_выборка"
'==========================================================================
'  АУДИТОРСКАЯ ВЫБОРКА из совокупности
'  Лист «Совокупность»: A № | B Документ | C Контрагент | D Сумма.
'  Три метода: 1) сплошь выше порога; 2) случайная N из остатка;
'              3) монетарная (MUS, систематическая по сумме — крупные вероятнее).
'  Запуск: Alt+F8 -> Выборка.
'==========================================================================
Option Explicit
Private Const КОЛ_СУММА As Long = 4   ' колонка с суммой

Public Sub Выборка()
    Dim s As Worksheet: Set s = Worksheets("Совокупность")
    Dim last As Long: last = s.Cells(s.Rows.Count, 1).End(xlUp).Row
    If last < 2 Then MsgBox "Совокупность пуста.", vbExclamation: Exit Sub

    Dim метод As String
    метод = InputBox("Метод выборки:" & vbCrLf & _
        "1 — сплошь выше порога (существенные)" & vbCrLf & _
        "2 — случайная N из остатка" & vbCrLf & _
        "3 — монетарная MUS (n элементов)", "Аудиторская выборка", "1")
    If метод = "" Then Exit Sub

    Dim f As Worksheet: Set f = ПересоздатьЛист("Выборка_результат")
    f.Range("A1:E1").Value = Array("№", "Документ", "Контрагент", "Сумма", "Метод отбора")
    Dim fr As Long, r As Long: fr = 2

    Select Case Trim(метод)
    Case "1"
        Dim порог As Double: порог = CDbl(Val(InputBox("Порог существенности (руб.):", , "100000")))
        For r = 2 To last
            If Abs(Znz(s.Cells(r, КОЛ_СУММА).Value)) >= порог Then Копия s, r, f, fr, "Сплошь > порога": fr = fr + 1
        Next r

    Case "2"
        Dim порог2 As Double: порог2 = CDbl(Val(InputBox("Отбираем из позиций НИЖЕ порога (руб.):", , "100000")))
        Dim n As Long: n = CLng(Val(InputBox("Сколько отобрать (N):", , "10")))
        ' собираем индексы остатка
        Dim idx() As Long, cnt As Long: ReDim idx(1 To last): cnt = 0
        For r = 2 To last
            If Abs(Znz(s.Cells(r, КОЛ_СУММА).Value)) < порог2 Then cnt = cnt + 1: idx(cnt) = r
        Next r
        If n > cnt Then n = cnt
        Randomize
        ' перемешиваем первые cnt и берём n (Fisher-Yates)
        Dim i As Long, j As Long, tmp As Long
        For i = cnt To 2 Step -1
            j = Int(Rnd * i) + 1
            tmp = idx(i): idx(i) = idx(j): idx(j) = tmp
        Next i
        For i = 1 To n
            Копия s, idx(i), f, fr, "Случайная": fr = fr + 1
        Next i

    Case "3"
        Dim nm As Long: nm = CLng(Val(InputBox("Сколько элементов отобрать (n):", , "12")))
        Dim total As Double: total = 0
        For r = 2 To last: total = total + Abs(Znz(s.Cells(r, КОЛ_СУММА).Value)): Next r
        If total <= 0 Or nm <= 0 Then MsgBox "Нет сумм для MUS.", vbExclamation: Exit Sub
        Dim interval As Double: interval = total / nm
        Randomize
        Dim target As Double: target = Rnd * interval
        Dim cum As Double: cum = 0
        For r = 2 To last
            cum = cum + Abs(Znz(s.Cells(r, КОЛ_СУММА).Value))
            Do While target <= cum And (fr - 2) < nm
                Копия s, r, f, fr, "MUS (монетарная)": fr = fr + 1
                target = target + interval
            Loop
        Next r

    Case Else
        MsgBox "Неизвестный метод. Введите 1, 2 или 3.", vbExclamation: Exit Sub
    End Select

    With f.Range("A1:E1")
        .Font.Bold = True: .Font.Color = vbWhite: .Interior.Color = RGB(79, 45, 127)
    End With
    f.Columns.AutoFit
    On Error Resume Next
    f.Rows("1:1").AutoFilter
    On Error GoTo 0
    f.Activate
    MsgBox "Отобрано элементов: " & (fr - 2), vbInformation, "Выборка готова"
End Sub

Private Sub Копия(s As Worksheet, r As Long, f As Worksheet, fr As Long, метод As String)
    f.Cells(fr, 1).Value = s.Cells(r, 1).Value
    f.Cells(fr, 2).Value = s.Cells(r, 2).Value
    f.Cells(fr, 3).Value = s.Cells(r, 3).Value
    f.Cells(fr, 4).Value = s.Cells(r, КОЛ_СУММА).Value
    f.Cells(fr, 5).Value = метод
End Sub

Private Function Znz(v As Variant) As Double
    If IsNumeric(v) Then Znz = CDbl(v) Else Znz = 0
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
