Attribute VB_Name = "Аналитика_ОСВ"
'==========================================================================
'  АРИФМЕТИЧЕСКАЯ СВЕРКА ОСВ  (полка «бери и пользуйся»)
'  Лист «ОСВ»: A Код | B Наименование | D/E сальдо начало Дт/Кт |
'              F/G оборот Дт/Кт | H/I сальдо конец Дт/Кт.
'  Ловит: разбаланс строки, несведение баланса по синтетическим,
'         пустые строки, развёрнутое сальдо. (Транзит НЕ ловим — это шум.)
'  Запуск: Alt+F8 -> ОСВ_Проверка.
'==========================================================================
Option Explicit
Private Const ДОПУСК As Double = 0.01   ' копеечная погрешность округления

Public Sub ОСВ_Проверка()
    Dim s As Worksheet: Set s = Worksheets("ОСВ")
    Dim hdr As Long, lastR As Long, r As Long
    lastR = s.Cells(s.Rows.Count, 1).End(xlUp).Row
    For r = 1 To lastR
        If Trim(CStr(s.Cells(r, 1).Value)) = "Код" Then hdr = r: Exit For
    Next r
    If hdr = 0 Then MsgBox "Не найдена шапка (ячейка «Код»).", vbCritical: Exit Sub

    Dim f As Worksheet: Set f = ПересоздатьЛист("ОСВ_флаги")
    f.Range("A1:E1").Value = Array("Код", "Наименование", "Тип", "Комментарий", "Расхождение")
    Dim fr As Long: fr = 2
    Dim синтБаланс As Double: синтБаланс = 0
    Dim штук As Long

    For r = hdr + 1 To lastR
        Dim code As String: code = Trim(CStr(s.Cells(r, 1).Value))
        If code <> "" Then
            штук = штук + 1
            Dim nn As Double, no As Double, nk As Double
            nn = Netto(s, r, 4, 5): no = Netto(s, r, 6, 7): nk = Netto(s, r, 8, 9)

            ' пустая строка
            If nn = 0 And no = 0 And nk = 0 Then
                ЗаписатьФлаг f, fr, s, r, "Пустая строка", "Ни сальдо, ни оборотов", 0
                fr = fr + 1
            Else
                ' разбаланс: конец должен = начало + оборот
                Dim diff As Double: diff = nk - (nn + no)
                If Abs(diff) > ДОПУСК Then
                    ЗаписатьФлаг f, fr, s, r, "Разбаланс строки", _
                        "Конец <> Начало + Оборот", diff: fr = fr + 1
                End If
                ' развёрнутое сальдо на конец (и Дт, и Кт одновременно)
                If Znz(s.Cells(r, 8).Value) <> 0 And Znz(s.Cells(r, 9).Value) <> 0 Then
                    ЗаписатьФлаг f, fr, s, r, "Развёрнутое сальдо", _
                        "Сальдо конец и по Дт, и по Кт", 0: fr = fr + 1
                End If
            End If

            ' баланс считаем ТОЛЬКО по синтетическим (код без точки)
            If InStr(code, ".") = 0 Then синтБаланс = синтБаланс + nk
        End If
    Next r

    ' контрольная строка: баланс должен сходиться в ноль
    If Abs(синтБаланс) > ДОПУСК Then
        f.Cells(fr, 1).Value = "—"
        f.Cells(fr, 3).Value = "Баланс не сходится"
        f.Cells(fr, 4).Value = "Σ сальдо конец по синтетическим счетам <> 0"
        f.Cells(fr, 5).Value = синтБаланс
        fr = fr + 1
    End If

    ' оформление
    With f.Range("A1:E1")
        .Font.Bold = True: .Font.Color = vbWhite: .Interior.Color = RGB(79, 45, 127)
    End With
    f.Columns.AutoFit
    On Error Resume Next
    f.Rows("1:1").AutoFilter
    On Error GoTo 0
    f.Activate
    MsgBox "Проверено счетов: " & штук & vbCrLf & "Флагов: " & (fr - 2) & vbCrLf & _
           "Баланс синтетических: " & Format(синтБаланс, "# ##0.00") & _
           IIf(Abs(синтБаланс) > ДОПУСК, " — НЕ сходится!", " — ок"), vbInformation
End Sub

Private Function Netto(s As Worksheet, r As Long, cD As Long, cK As Long) As Double
    Netto = Znz(s.Cells(r, cD).Value) - Znz(s.Cells(r, cK).Value)
End Function

Private Function Znz(v As Variant) As Double
    If IsNumeric(v) Then Znz = CDbl(v) Else Znz = 0
End Function

Private Sub ЗаписатьФлаг(f As Worksheet, fr As Long, s As Worksheet, r As Long, _
                        тип As String, комм As String, расх As Double)
    f.Cells(fr, 1).Value = s.Cells(r, 1).Value
    f.Cells(fr, 2).Value = s.Cells(r, 2).Value
    f.Cells(fr, 3).Value = тип
    f.Cells(fr, 4).Value = комм
    If расх <> 0 Then f.Cells(fr, 5).Value = расх
End Sub

Private Function ПересоздатьЛист(имя As String) As Worksheet
    Application.DisplayAlerts = False
    On Error Resume Next
    Worksheets(имя).Delete
    On Error GoTo 0
    Application.DisplayAlerts = True
    Dim ws As Worksheet: Set ws = Worksheets.Add: ws.Name = имя
    Set ПересоздатьЛист = ws
End Function
