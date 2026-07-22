Attribute VB_Name = "JET_тесты"
'==========================================================================
'  JET — МЕХАНИЧЕСКИЕ ТЕСТЫ ЖУРНАЛЬНЫХ ПРОВОДОК  (воркшоп «ИИ для аудиторов»)
'--------------------------------------------------------------------------
'  1) "схлопывает" грязную многострочную выгрузку 1С (лист «Проводки»)
'     в чистую таблицу «JET_данные» — одна строка = одна проводка;
'  2) гоняет 11 арифметических тестов (1,3,4,5,6,7,9,10,11,13) + Бенфорд (12);
'  3) пишет все срабатывания на лист «Флаги».
'
'  Тесты 2 (нетипичные) и 8 (подозрительные описания) — работа АГЕНТА.
'
'  ДВА СПОСОБА ЗАПУСКА:
'    • ПрогнатьВсеТесты — один прогон, всё на лист «Флаги» (главная кнопка).
'    • Любой ТестNN можно повесить на отдельную кнопку — он самодостаточен.
'==========================================================================
Option Explicit

Private Const SH_ДАННЫЕ As String = "Проводки"
Private Const SH_ЧИСТО  As String = "JET_данные"
Private Const SH_ФЛАГИ  As String = "Флаги"
Private Const SH_НАСТР  As String = "JET_настройки"
Private Const SH_БЕНФ   As String = "JET_Бенфорд"

Private Const cНОМ = 1, cСТРОКА = 2, cДАТАТ = 3, cДАТА = 4, cДОК = 5
Private Const cСОДЕРЖ = 6, cДТ = 7, cКТ = 8, cСУММА = 9
Private Const cСУБДТ = 10, cСУБКТ = 11, cПЕРВИЧКА = 12, cЖУРН = 13

Private flagRow As Long
Private мастерРежим As Boolean   ' True, когда тесты идут из ПрогнатьВсеТесты

'==========================================================================
'  МАСТЕР
'==========================================================================
Public Sub ПрогнатьВсеТесты()
    Dim t As Double: t = Timer
    Application.ScreenUpdating = False
    мастерРежим = True
    ПодготовитьДанные
    ОчиститьИШапка

    Тест01_Полнота
    Тест03_Выходные
    Тест04_КруглыеИ999
    Тест05_КрупныеСуммы
    Тест06_ПовторСумм
    Тест07_ДтРавноКт
    Тест09_РедкиеПары
    Тест10_Сторно
    Тест11_БезОписания
    Тест13_БезСумм
    Тест12_Бенфорд

    ОформитьФлаги
    мастерРежим = False
    Application.ScreenUpdating = True
    MsgBox "Готово. Срабатываний: " & (flagRow - 2) & vbCrLf & _
           "Смотри лист «Флаги» (и «JET_Бенфорд»)." & vbCrLf & _
           "Тесты 2 и 8 — за агентом, не за макросом.", vbInformation, _
           Format(Timer - t, "0.0") & " сек"
End Sub

'==========================================================================
'  НОРМАЛИЗАЦИЯ выгрузки 1С -> одна строка на проводку
'==========================================================================
Public Sub ПодготовитьДанные()
    Dim src As Worksheet, dst As Worksheet
    Set src = Worksheets(SH_ДАННЫЕ)
    Set dst = ПересоздатьЛист(SH_ЧИСТО)

    Dim h, i As Long
    h = Array("№", "Стр.1С", "Дата", "ДатаЗнач", "Документ", "Содержание", _
              "Дт", "Кт", "Сумма", "Субконто Дт", "Субконто Кт", "Первичка", "Журнал")
    For i = 0 To UBound(h): dst.Cells(1, i + 1).Value = h(i): Next i

    Dim hdr As Long, lastR As Long
    lastR = src.Cells(src.Rows.Count, 1).End(xlUp).Row
    For i = 1 To lastR
        If Trim(CStr(src.Cells(i, 1).Value)) = "Дата" Then hdr = i: Exit For
    Next i
    If hdr = 0 Then MsgBox "Не найдена шапка с колонкой «Дата».", vbCritical: End

    Dim r As Long, outR As Long, num As Long, prevOut As Long
    outR = 2: num = 0: prevOut = 0
    For r = hdr + 1 To lastR
        Dim dCell As String: dCell = Trim(CStr(src.Cells(r, 1).Value))
        If dCell <> "" Then
            num = num + 1
            dst.Cells(outR, cНОМ).Value = num
            dst.Cells(outR, cСТРОКА).Value = r
            dst.Cells(outR, cДАТАТ).Value = dCell
            dst.Cells(outR, cДАТА).Value = ПарсДату(dCell)
            dst.Cells(outR, cДОК).Value = src.Cells(r, 2).Value
            dst.Cells(outR, cСОДЕРЖ).Value = src.Cells(r, 3).Value
            dst.Cells(outR, cДТ).Value = Trim(CStr(src.Cells(r, 4).Value))
            dst.Cells(outR, cКТ).Value = Trim(CStr(src.Cells(r, 6).Value))
            If IsNumeric(src.Cells(r, 8).Value) And src.Cells(r, 8).Value <> "" Then _
                dst.Cells(outR, cСУММА).Value = src.Cells(r, 8).Value
            dst.Cells(outR, cСУБДТ).Value = src.Cells(r, 9).Value
            dst.Cells(outR, cСУБКТ).Value = src.Cells(r, 10).Value
            dst.Cells(outR, cЖУРН).Value = src.Cells(r, 11).Value
            prevOut = outR
            outR = outR + 1
        ElseIf prevOut > 0 Then
            Dim extra As String: extra = Trim(CStr(src.Cells(r, 9).Value))
            If extra <> "" Then dst.Cells(prevOut, cПЕРВИЧКА).Value = _
                Trim(dst.Cells(prevOut, cПЕРВИЧКА).Value & " | " & extra)
        End If
    Next r
    dst.Columns.AutoFit
End Sub

'==========================================================================
'  ТЕСТЫ
'==========================================================================
Public Sub Тест01_Полнота()
    Dim d As Worksheet: Set d = Старт(): Dim r As Long, n As Long: n = ПоследняяСтрока(d)
    Dim итог As Double
    For r = 2 To n
        Dim p As String: p = ""
        If Trim(d.Cells(r, cДТ).Value) = "" Then p = p & "нет Дт; "
        If Trim(d.Cells(r, cКТ).Value) = "" Then p = p & "нет Кт; "
        If Not IsDate(d.Cells(r, cДАТА).Value) Then p = p & "не распознана дата; "
        If p <> "" Then ЗаписатьФлаг d, r, "1. Полнота", p
        If IsNumeric(d.Cells(r, cСУММА).Value) Then итог = итог + d.Cells(r, cСУММА).Value
    Next r
    ЗаписатьФлаг d, 1, "1. Полнота (контроль)", "Всего проводок: " & (n - 1) & _
        "; сумма по столбцу: " & Format(итог, "# ##0.00")
    Финиш
End Sub

Public Sub Тест03_Выходные()
    Dim d As Worksheet: Set d = Старт(): Dim r As Long, n As Long: n = ПоследняяСтрока(d)
    Dim празд As Object: Set празд = СписокПраздников()
    For r = 2 To n
        Dim dt As Variant: dt = d.Cells(r, cДАТА).Value
        If IsDate(dt) Then
            Dim wd As Integer: wd = Weekday(dt, vbMonday)
            If wd >= 6 Then
                ЗаписатьФлаг d, r, "3. Выходной", "Дата — " & IIf(wd = 6, "суббота", "воскресенье")
            ElseIf празд.Exists(Format(dt, "dd.mm")) Then
                ЗаписатьФлаг d, r, "3. Праздник", "Праздничный день " & Format(dt, "dd.mm")
            End If
        End If
    Next r
    Финиш
End Sub

Public Sub Тест04_КруглыеИ999()
    Dim d As Worksheet: Set d = Старт(): Dim r As Long, n As Long: n = ПоследняяСтрока(d)
    For r = 2 To n
        If IsNumeric(d.Cells(r, cСУММА).Value) Then
            Dim s As Double: s = d.Cells(r, cСУММА).Value
            Dim ip As Long: ip = Int(Abs(s))
            If s <> 0 And s = ip And (ip Mod 1000 = 0) Then
                ЗаписатьФлаг d, r, "4. Круглая сумма", "Кратна 1000: " & Format(s, "# ##0.00")
            ElseIf ip Mod 1000 = 999 Then
                ЗаписатьФлаг d, r, "4. Паттерн 999", "Хвост 999: " & Format(s, "# ##0.00")
            End If
        End If
    Next r
    Финиш
End Sub

Public Sub Тест05_КрупныеСуммы()
    Dim d As Worksheet: Set d = Старт(): Dim r As Long, n As Long: n = ПоследняяСтрока(d)
    Dim порог As Double: порог = ПорогТЕ()
    For r = 2 To n
        If IsNumeric(d.Cells(r, cСУММА).Value) Then
            If Abs(d.Cells(r, cСУММА).Value) > порог Then ЗаписатьФлаг d, r, "5. Крупная (> ТЕ)", _
                Format(d.Cells(r, cСУММА).Value, "# ##0.00") & " > " & Format(порог, "# ##0")
        End If
    Next r
    Финиш
End Sub

Public Sub Тест06_ПовторСумм()
    Dim d As Worksheet: Set d = Старт(): Dim r As Long, n As Long: n = ПоследняяСтрока(d)
    Dim cnt As Object: Set cnt = CreateObject("Scripting.Dictionary")
    For r = 2 To n
        If IsNumeric(d.Cells(r, cСУММА).Value) Then
            Dim k As String: k = Trim(d.Cells(r, cСОДЕРЖ).Value) & "|" & Format(d.Cells(r, cСУММА).Value, "0.00")
            cnt(k) = cnt(k) + 1
        End If
    Next r
    For r = 2 To n
        If IsNumeric(d.Cells(r, cСУММА).Value) Then
            Dim k2 As String: k2 = Trim(d.Cells(r, cСОДЕРЖ).Value) & "|" & Format(d.Cells(r, cСУММА).Value, "0.00")
            If cnt(k2) > 1 Then ЗаписатьФлаг d, r, "6. Повтор суммы", _
                "Сумма+содержание повторяется " & cnt(k2) & " раз"
        End If
    Next r
    Финиш
End Sub

Public Sub Тест07_ДтРавноКт()
    Dim d As Worksheet: Set d = Старт(): Dim r As Long, n As Long: n = ПоследняяСтрока(d)
    For r = 2 To n
        Dim a As String, b As String
        a = Trim(d.Cells(r, cДТ).Value): b = Trim(d.Cells(r, cКТ).Value)
        If a <> "" And a = b Then ЗаписатьФлаг d, r, "7. Дт = Кт", "Оба счёта: " & a
    Next r
    Финиш
End Sub

Public Sub Тест09_РедкиеПары()
    Dim d As Worksheet: Set d = Старт(): Dim r As Long, n As Long: n = ПоследняяСтрока(d)
    Dim порог As Long: порог = ПорогРедкости()
    Dim cnt As Object: Set cnt = CreateObject("Scripting.Dictionary")
    For r = 2 To n
        Dim p As String: p = Trim(d.Cells(r, cДТ).Value) & ">" & Trim(d.Cells(r, cКТ).Value)
        If p <> ">" Then cnt(p) = cnt(p) + 1
    Next r
    For r = 2 To n
        Dim p2 As String: p2 = Trim(d.Cells(r, cДТ).Value) & ">" & Trim(d.Cells(r, cКТ).Value)
        If p2 <> ">" Then
            If cnt(p2) <= порог Then ЗаписатьФлаг d, r, "9. Редкая пара", _
                "Корреспонденция " & p2 & " — всего " & cnt(p2) & " раз(а)"
        End If
    Next r
    Финиш
End Sub

Public Sub Тест10_Сторно()
    Dim d As Worksheet: Set d = Старт(): Dim r As Long, n As Long: n = ПоследняяСтрока(d)
    For r = 2 To n
        If IsNumeric(d.Cells(r, cСУММА).Value) Then
            If d.Cells(r, cСУММА).Value < 0 Then ЗаписатьФлаг d, r, "10. Сторно", _
                "Отрицательная сумма: " & Format(d.Cells(r, cСУММА).Value, "# ##0.00")
        End If
    Next r
    Финиш
End Sub

Public Sub Тест11_БезОписания()
    Dim d As Worksheet: Set d = Старт(): Dim r As Long, n As Long: n = ПоследняяСтрока(d)
    For r = 2 To n
        If Trim(CStr(d.Cells(r, cСОДЕРЖ).Value)) = "" Then _
            ЗаписатьФлаг d, r, "11. Без описания", "Поле «Содержание» пусто"
    Next r
    Финиш
End Sub

Public Sub Тест13_БезСумм()
    Dim d As Worksheet: Set d = Старт(): Dim r As Long, n As Long: n = ПоследняяСтрока(d)
    For r = 2 To n
        Dim v As Variant: v = d.Cells(r, cСУММА).Value
        If Not IsNumeric(v) Or v = "" Then
            ЗаписатьФлаг d, r, "13. Без суммы", "Поле «Сумма» пусто/нечисловое"
        ElseIf v = 0 Then
            ЗаписатьФлаг d, r, "13. Без суммы", "Сумма = 0"
        End If
    Next r
    Финиш
End Sub

Public Sub Тест12_Бенфорд()
    Dim d As Worksheet: Set d = Старт(): Dim r As Long, n As Long: n = ПоследняяСтрока(d)
    Dim факт(1 To 9) As Long, всего As Long, i As Integer
    For r = 2 To n
        If IsNumeric(d.Cells(r, cСУММА).Value) Then
            Dim s As String: s = Replace(Format(Abs(d.Cells(r, cСУММА).Value), "0"), " ", "")
            Dim j As Integer
            For j = 1 To Len(s)
                Dim ch As String: ch = Mid(s, j, 1)
                If ch >= "1" And ch <= "9" Then
                    факт(CInt(ch)) = факт(CInt(ch)) + 1: всего = всего + 1: Exit For
                End If
            Next j
        End If
    Next r
    Dim b As Worksheet: Set b = ПересоздатьЛист(SH_БЕНФ)
    b.Range("A1:E1").Value = Array("Цифра", "Ожидаемо, %", "Факт, %", "Кол-во", "Отклонение, п.п.")
    For i = 1 To 9
        Dim ожид As Double: ожид = Log(1 + 1 / i) / Log(10) * 100
        Dim фп As Double: фп = IIf(всего > 0, факт(i) / всего * 100, 0)
        b.Cells(i + 1, 1).Value = i
        b.Cells(i + 1, 2).Value = Round(ожид, 1)
        b.Cells(i + 1, 3).Value = Round(фп, 1)
        b.Cells(i + 1, 4).Value = факт(i)
        b.Cells(i + 1, 5).Value = Round(фп - ожид, 1)
        If Abs(фп - ожид) > 8 Then b.Cells(i + 1, 5).Interior.Color = RGB(255, 230, 180)
    Next i
    b.Columns.AutoFit
    ЗаписатьФлаг d, 1, "12. Бенфорд", "См. лист «JET_Бенфорд»: отклонения > 8 п.п. подсвечены."
    Финиш
End Sub

'==========================================================================
'  НАСТРОЙКИ
'==========================================================================
Private Function ПорогТЕ() As Double
    Dim ws As Worksheet: Set ws = ЛистНастроек()
    If IsNumeric(ws.Range("B1").Value) Then If ws.Range("B1").Value > 0 Then ПорогТЕ = ws.Range("B1").Value
    If ПорогТЕ = 0 Then ПорогТЕ = 100000
End Function

Private Function ПорогРедкости() As Long
    Dim ws As Worksheet: Set ws = ЛистНастроек()
    If IsNumeric(ws.Range("B2").Value) Then If ws.Range("B2").Value > 0 Then ПорогРедкости = ws.Range("B2").Value
    If ПорогРедкости = 0 Then ПорогРедкости = 2
End Function

Private Function СписокПраздников() As Object
    Dim ws As Worksheet: Set ws = ЛистНастроек()
    Dim d As Object: Set d = CreateObject("Scripting.Dictionary")
    Dim r As Long: r = 5
    Do While Trim(CStr(ws.Cells(r, 1).Value)) <> ""
        d(Trim(CStr(ws.Cells(r, 1).Value))) = True
        r = r + 1
    Loop
    Set СписокПраздников = d
End Function

Private Function ЛистНастроек() As Worksheet
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = Worksheets(SH_НАСТР)
    On Error GoTo 0
    If ws Is Nothing Then
        Set ws = Worksheets.Add: ws.Name = SH_НАСТР
        ws.Range("A1").Value = "Порог существенности (ТЕ), руб.": ws.Range("B1").Value = 100000
        ws.Range("A2").Value = "Порог «редкой» пары (раз и менее)": ws.Range("B2").Value = 2
        ws.Range("A4").Value = "Праздничные дни (дд.мм):"
        Dim hol, i As Long: hol = Array("01.01", "02.01", "07.01", "08.03", "01.05", "09.05", "03.07", "07.11", "25.12")
        For i = 0 To UBound(hol): ws.Cells(5 + i, 1).Value = hol(i): Next i
        ws.Columns.AutoFit
    End If
    Set ЛистНастроек = ws
End Function

'==========================================================================
'  СЛУЖЕБНОЕ
'==========================================================================
Private Function Старт() As Worksheet
    ' если тест запущен в одиночку — сам готовит данные и шапку «Флагов»
    If Not мастерРежим Then
        ПодготовитьДанные
        ОчиститьИШапка
    End If
    Set Старт = ДанныеГотовы()
End Function

Private Sub Финиш()
    If Not мастерРежим Then ОформитьФлаги
End Sub

Private Function ПарсДату(ByVal s As String) As Variant
    Dim p As String: p = Trim(Split(s, " ")(0))
    Dim a() As String: a = Split(p, ".")
    On Error GoTo нет
    If UBound(a) = 2 Then ПарсДату = DateSerial(CInt(a(2)), CInt(a(1)), CInt(a(0))): Exit Function
нет:
    ПарсДату = ""
End Function

Private Function ДанныеГотовы() As Worksheet
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = Worksheets(SH_ЧИСТО)
    On Error GoTo 0
    If ws Is Nothing Then ПодготовитьДанные: Set ws = Worksheets(SH_ЧИСТО)
    Set ДанныеГотовы = ws
End Function

Private Function ПоследняяСтрока(ws As Worksheet) As Long
    ПоследняяСтрока = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
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

Private Sub ОчиститьИШапка()
    Dim ws As Worksheet: Set ws = ПересоздатьЛист(SH_ФЛАГИ)
    ws.Range("A1:G1").Value = Array("Стр.1С", "Дата", "Документ", "Сумма", "Содержание", "Тест", "Комментарий")
    flagRow = 2
End Sub

Private Sub ЗаписатьФлаг(d As Worksheet, srcRow As Long, тест As String, коммент As String)
    Dim f As Worksheet: Set f = Worksheets(SH_ФЛАГИ)
    If srcRow >= 2 Then
        f.Cells(flagRow, 1).Value = d.Cells(srcRow, cСТРОКА).Value
        f.Cells(flagRow, 2).Value = d.Cells(srcRow, cДАТАТ).Value
        f.Cells(flagRow, 3).Value = d.Cells(srcRow, cДОК).Value
        f.Cells(flagRow, 4).Value = d.Cells(srcRow, cСУММА).Value
        f.Cells(flagRow, 5).Value = d.Cells(srcRow, cСОДЕРЖ).Value
    End If
    f.Cells(flagRow, 6).Value = тест
    f.Cells(flagRow, 7).Value = коммент
    flagRow = flagRow + 1
End Sub

Private Sub ОформитьФлаги()
    Dim f As Worksheet: Set f = Worksheets(SH_ФЛАГИ)
    With f.Range("A1:G1")
        .Font.Bold = True: .Font.Color = vbWhite
        .Interior.Color = RGB(79, 45, 127)
    End With
    f.Columns.AutoFit
    On Error Resume Next
    f.Rows("1:1").AutoFilter
    On Error GoTo 0
    f.Activate
End Sub
