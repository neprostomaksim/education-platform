Attribute VB_Name = "JET_Tests"
'==========================================================================
'  JET - MECHANICAL JOURNAL ENTRY TESTS  (workshop "AI for auditors")
'--------------------------------------------------------------------------
'  1) collapses a messy multi-row 1C export (FIRST sheet) into a clean table
'     "JET_Data" - one row = one entry;
'  2) runs 11 arithmetic tests (1,3,4,5,6,7,9,10,11,13) + Benford (12);
'  3) writes all hits to sheet "Flags".
'
'  Tests 2 (unusual) and 8 (suspicious descriptions) are AGENT work, not macro.
'
'  RUN:
'    - RunAllTests  - one pass, everything to "Flags" (main button).
'    - Any TestNN can be run alone - it is self-sufficient.
'  ASCII-only source: pastes correctly on any Windows locale.
'  Source data must be on the FIRST sheet (header row contains the Cyrillic date header).
'==========================================================================
Option Explicit

Private Const SH_CLEAN As String = "JET_Data"
Private Const SH_FLAGS As String = "Flags"
Private Const SH_CFG   As String = "JET_Settings"
Private Const SH_BENF  As String = "JET_Benford"

Private Const cNo = 1, cSrcRow = 2, cDateText = 3, cDate = 4, cDoc = 5
Private Const cDesc = 6, cDr = 7, cCr = 8, cAmount = 9
Private Const cSubDr = 10, cSubCr = 11, cPrimary = 12, cJournal = 13

Private flagRow As Long
Private masterMode As Boolean

Private Function HDR_DATE() As String
    HDR_DATE = ChrW(1044) & ChrW(1072) & ChrW(1090) & ChrW(1072)  ' builds Cyrillic date header "Data"
End Function

'==========================================================================
'  MASTER
'==========================================================================
Public Sub RunAllTests()
    Dim t As Double: t = Timer
    Application.ScreenUpdating = False
    masterMode = True
    PrepareData
    ClearAndHeader

    Test01_Completeness
    Test03_Weekend
    Test04_RoundAnd999
    Test05_LargeAmount
    Test06_DuplicateAmount
    Test07_DrEqualsCr
    Test09_RarePair
    Test10_Reversal
    Test11_NoDescription
    Test13_NoAmount
    Test12_Benford

    FormatFlags
    masterMode = False
    Application.ScreenUpdating = True
    MsgBox "Done. Hits: " & (flagRow - 2) & vbCrLf & _
           "See sheet 'Flags' (and 'JET_Benford')." & vbCrLf & _
           "Tests 2 and 8 are for the agent, not the macro.", vbInformation, _
           Format(Timer - t, "0.0") & " sec"
End Sub

'==========================================================================
'  NORMALIZE 1C export -> one row per entry
'==========================================================================
Public Sub PrepareData()
    Dim src As Worksheet, dst As Worksheet
    Set src = Worksheets(1)
    Set dst = RecreateSheet(SH_CLEAN)

    Dim h, i As Long
    h = Array("No", "SrcRow", "Date", "DateVal", "Document", "Description", _
              "Dr", "Cr", "Amount", "Subconto Dr", "Subconto Cr", "Primary", "Journal")
    For i = 0 To UBound(h): dst.Cells(1, i + 1).Value = h(i): Next i

    Dim hdr As Long, lastR As Long, hDate As String: hDate = HDR_DATE()
    lastR = src.Cells(src.Rows.Count, 1).End(xlUp).Row
    For i = 1 To lastR
        If Trim(CStr(src.Cells(i, 1).Value)) = hDate Then hdr = i: Exit For
    Next i
    If hdr = 0 Then MsgBox "Header row with cell 'Data' not found.", vbCritical: End

    Dim r As Long, outR As Long, num As Long, prevOut As Long
    outR = 2: num = 0: prevOut = 0
    For r = hdr + 1 To lastR
        Dim dCell As String: dCell = Trim(CStr(src.Cells(r, 1).Value))
        If dCell <> "" Then
            num = num + 1
            dst.Cells(outR, cNo).Value = num
            dst.Cells(outR, cSrcRow).Value = r
            dst.Cells(outR, cDateText).Value = dCell
            dst.Cells(outR, cDate).Value = ParseDate(dCell)
            dst.Cells(outR, cDoc).Value = src.Cells(r, 2).Value
            dst.Cells(outR, cDesc).Value = src.Cells(r, 3).Value
            dst.Cells(outR, cDr).Value = Trim(CStr(src.Cells(r, 4).Value))
            dst.Cells(outR, cCr).Value = Trim(CStr(src.Cells(r, 6).Value))
            If IsNumeric(src.Cells(r, 8).Value) And src.Cells(r, 8).Value <> "" Then _
                dst.Cells(outR, cAmount).Value = src.Cells(r, 8).Value
            dst.Cells(outR, cSubDr).Value = src.Cells(r, 9).Value
            dst.Cells(outR, cSubCr).Value = src.Cells(r, 10).Value
            dst.Cells(outR, cJournal).Value = src.Cells(r, 11).Value
            prevOut = outR
            outR = outR + 1
        ElseIf prevOut > 0 Then
            Dim extra As String: extra = Trim(CStr(src.Cells(r, 9).Value))
            If extra <> "" Then dst.Cells(prevOut, cPrimary).Value = _
                Trim(dst.Cells(prevOut, cPrimary).Value & " | " & extra)
        End If
    Next r
    dst.Columns.AutoFit
End Sub

'==========================================================================
'  TESTS
'==========================================================================
Public Sub Test01_Completeness()
    Dim d As Worksheet: Set d = StartTest(): Dim r As Long, n As Long: n = LastRow(d)
    Dim total As Double
    For r = 2 To n
        Dim p As String: p = ""
        If Trim(d.Cells(r, cDr).Value) = "" Then p = p & "no Dr; "
        If Trim(d.Cells(r, cCr).Value) = "" Then p = p & "no Cr; "
        If Not IsDate(d.Cells(r, cDate).Value) Then p = p & "date not parsed; "
        If p <> "" Then WriteFlag d, r, "1. Completeness", p
        If IsNumeric(d.Cells(r, cAmount).Value) Then total = total + d.Cells(r, cAmount).Value
    Next r
    WriteFlag d, 1, "1. Completeness (control)", "Entries total: " & (n - 1) & _
        "; amount sum: " & Format(total, "# ##0.00")
    FinishTest
End Sub

Public Sub Test03_Weekend()
    Dim d As Worksheet: Set d = StartTest(): Dim r As Long, n As Long: n = LastRow(d)
    Dim hol As Object: Set hol = HolidayList()
    For r = 2 To n
        Dim dt As Variant: dt = d.Cells(r, cDate).Value
        If IsDate(dt) Then
            Dim wd As Integer: wd = Weekday(dt, vbMonday)
            If wd >= 6 Then
                WriteFlag d, r, "3. Weekend", "Date is " & IIf(wd = 6, "Saturday", "Sunday")
            ElseIf hol.Exists(Format(dt, "dd.mm")) Then
                WriteFlag d, r, "3. Holiday", "Holiday " & Format(dt, "dd.mm")
            End If
        End If
    Next r
    FinishTest
End Sub

Public Sub Test04_RoundAnd999()
    Dim d As Worksheet: Set d = StartTest(): Dim r As Long, n As Long: n = LastRow(d)
    For r = 2 To n
        If IsNumeric(d.Cells(r, cAmount).Value) Then
            Dim s As Double: s = d.Cells(r, cAmount).Value
            Dim ip As Long: ip = Int(Abs(s))
            If s <> 0 And s = ip And (ip Mod 1000 = 0) Then
                WriteFlag d, r, "4. Round amount", "Multiple of 1000: " & Format(s, "# ##0.00")
            ElseIf ip Mod 1000 = 999 Then
                WriteFlag d, r, "4. Pattern 999", "Tail 999: " & Format(s, "# ##0.00")
            End If
        End If
    Next r
    FinishTest
End Sub

Public Sub Test05_LargeAmount()
    Dim d As Worksheet: Set d = StartTest(): Dim r As Long, n As Long: n = LastRow(d)
    Dim thr As Double: thr = MaterialityThreshold()
    For r = 2 To n
        If IsNumeric(d.Cells(r, cAmount).Value) Then
            If Abs(d.Cells(r, cAmount).Value) > thr Then WriteFlag d, r, "5. Large (> materiality)", _
                Format(d.Cells(r, cAmount).Value, "# ##0.00") & " > " & Format(thr, "# ##0")
        End If
    Next r
    FinishTest
End Sub

Public Sub Test06_DuplicateAmount()
    Dim d As Worksheet: Set d = StartTest(): Dim r As Long, n As Long: n = LastRow(d)
    Dim cnt As Object: Set cnt = CreateObject("Scripting.Dictionary")
    For r = 2 To n
        If IsNumeric(d.Cells(r, cAmount).Value) Then
            Dim k As String: k = Trim(d.Cells(r, cDesc).Value) & "|" & Format(d.Cells(r, cAmount).Value, "0.00")
            cnt(k) = cnt(k) + 1
        End If
    Next r
    For r = 2 To n
        If IsNumeric(d.Cells(r, cAmount).Value) Then
            Dim k2 As String: k2 = Trim(d.Cells(r, cDesc).Value) & "|" & Format(d.Cells(r, cAmount).Value, "0.00")
            If cnt(k2) > 1 Then WriteFlag d, r, "6. Duplicate amount", _
                "Amount+description repeats " & cnt(k2) & " times"
        End If
    Next r
    FinishTest
End Sub

Public Sub Test07_DrEqualsCr()
    Dim d As Worksheet: Set d = StartTest(): Dim r As Long, n As Long: n = LastRow(d)
    For r = 2 To n
        Dim a As String, b As String
        a = Trim(d.Cells(r, cDr).Value): b = Trim(d.Cells(r, cCr).Value)
        If a <> "" And a = b Then WriteFlag d, r, "7. Dr = Cr", "Both accounts: " & a
    Next r
    FinishTest
End Sub

Public Sub Test09_RarePair()
    Dim d As Worksheet: Set d = StartTest(): Dim r As Long, n As Long: n = LastRow(d)
    Dim thr As Long: thr = RareThreshold()
    Dim cnt As Object: Set cnt = CreateObject("Scripting.Dictionary")
    For r = 2 To n
        Dim p As String: p = Trim(d.Cells(r, cDr).Value) & ">" & Trim(d.Cells(r, cCr).Value)
        If p <> ">" Then cnt(p) = cnt(p) + 1
    Next r
    For r = 2 To n
        Dim p2 As String: p2 = Trim(d.Cells(r, cDr).Value) & ">" & Trim(d.Cells(r, cCr).Value)
        If p2 <> ">" Then
            If cnt(p2) <= thr Then WriteFlag d, r, "9. Rare pair", _
                "Correspondence " & p2 & " - only " & cnt(p2) & " time(s)"
        End If
    Next r
    FinishTest
End Sub

Public Sub Test10_Reversal()
    Dim d As Worksheet: Set d = StartTest(): Dim r As Long, n As Long: n = LastRow(d)
    For r = 2 To n
        If IsNumeric(d.Cells(r, cAmount).Value) Then
            If d.Cells(r, cAmount).Value < 0 Then WriteFlag d, r, "10. Reversal", _
                "Negative amount: " & Format(d.Cells(r, cAmount).Value, "# ##0.00")
        End If
    Next r
    FinishTest
End Sub

Public Sub Test11_NoDescription()
    Dim d As Worksheet: Set d = StartTest(): Dim r As Long, n As Long: n = LastRow(d)
    For r = 2 To n
        If Trim(CStr(d.Cells(r, cDesc).Value)) = "" Then _
            WriteFlag d, r, "11. No description", "Field 'Description' is empty"
    Next r
    FinishTest
End Sub

Public Sub Test13_NoAmount()
    Dim d As Worksheet: Set d = StartTest(): Dim r As Long, n As Long: n = LastRow(d)
    For r = 2 To n
        Dim v As Variant: v = d.Cells(r, cAmount).Value
        If Not IsNumeric(v) Or v = "" Then
            WriteFlag d, r, "13. No amount", "Field 'Amount' empty/non-numeric"
        ElseIf v = 0 Then
            WriteFlag d, r, "13. No amount", "Amount = 0"
        End If
    Next r
    FinishTest
End Sub

Public Sub Test12_Benford()
    Dim d As Worksheet: Set d = StartTest(): Dim r As Long, n As Long: n = LastRow(d)
    Dim fact(1 To 9) As Long, total As Long, i As Integer
    For r = 2 To n
        If IsNumeric(d.Cells(r, cAmount).Value) Then
            Dim s As String: s = Replace(Format(Abs(d.Cells(r, cAmount).Value), "0"), " ", "")
            Dim j As Integer
            For j = 1 To Len(s)
                Dim ch As String: ch = Mid(s, j, 1)
                If ch >= "1" And ch <= "9" Then
                    fact(CInt(ch)) = fact(CInt(ch)) + 1: total = total + 1: Exit For
                End If
            Next j
        End If
    Next r
    Dim b As Worksheet: Set b = RecreateSheet(SH_BENF)
    b.Range("A1:E1").Value = Array("Digit", "Expected %", "Actual %", "Count", "Deviation pp")
    For i = 1 To 9
        Dim exp As Double: exp = Log(1 + 1 / i) / Log(10) * 100
        Dim act As Double: act = IIf(total > 0, fact(i) / total * 100, 0)
        b.Cells(i + 1, 1).Value = i
        b.Cells(i + 1, 2).Value = Round(exp, 1)
        b.Cells(i + 1, 3).Value = Round(act, 1)
        b.Cells(i + 1, 4).Value = fact(i)
        b.Cells(i + 1, 5).Value = Round(act - exp, 1)
        If Abs(act - exp) > 8 Then b.Cells(i + 1, 5).Interior.Color = RGB(255, 230, 180)
    Next i
    b.Columns.AutoFit
    WriteFlag d, 1, "12. Benford", "See sheet 'JET_Benford': deviations > 8 pp highlighted."
    FinishTest
End Sub

'==========================================================================
'  SETTINGS
'==========================================================================
Private Function MaterialityThreshold() As Double
    Dim ws As Worksheet: Set ws = SettingsSheet()
    If IsNumeric(ws.Range("B1").Value) Then If ws.Range("B1").Value > 0 Then MaterialityThreshold = ws.Range("B1").Value
    If MaterialityThreshold = 0 Then MaterialityThreshold = 100000
End Function

Private Function RareThreshold() As Long
    Dim ws As Worksheet: Set ws = SettingsSheet()
    If IsNumeric(ws.Range("B2").Value) Then If ws.Range("B2").Value > 0 Then RareThreshold = ws.Range("B2").Value
    If RareThreshold = 0 Then RareThreshold = 2
End Function

Private Function HolidayList() As Object
    Dim ws As Worksheet: Set ws = SettingsSheet()
    Dim d As Object: Set d = CreateObject("Scripting.Dictionary")
    Dim r As Long: r = 5
    Do While Trim(CStr(ws.Cells(r, 1).Value)) <> ""
        d(Trim(CStr(ws.Cells(r, 1).Value))) = True
        r = r + 1
    Loop
    Set HolidayList = d
End Function

Private Function SettingsSheet() As Worksheet
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = Worksheets(SH_CFG)
    On Error GoTo 0
    If ws Is Nothing Then
        Set ws = Worksheets.Add(After:=Worksheets(Worksheets.Count)): ws.Name = SH_CFG
        ws.Range("A1").Value = "Materiality threshold": ws.Range("B1").Value = 100000
        ws.Range("A2").Value = "Rare pair threshold (times or less)": ws.Range("B2").Value = 2
        ws.Range("A4").Value = "Holidays (dd.mm):"
        Dim hol, i As Long: hol = Array("01.01", "02.01", "07.01", "08.03", "01.05", "09.05", "03.07", "07.11", "25.12")
        For i = 0 To UBound(hol): ws.Cells(5 + i, 1).Value = hol(i): Next i
        ws.Columns.AutoFit
    End If
    Set SettingsSheet = ws
End Function

'==========================================================================
'  UTILITY
'==========================================================================
Private Function StartTest() As Worksheet
    If Not masterMode Then
        PrepareData
        ClearAndHeader
    End If
    Set StartTest = DataReady()
End Function

Private Sub FinishTest()
    If Not masterMode Then FormatFlags
End Sub

Private Function ParseDate(ByVal s As String) As Variant
    Dim p As String: p = Trim(Split(s, " ")(0))
    Dim a() As String: a = Split(p, ".")
    On Error GoTo bad
    If UBound(a) = 2 Then ParseDate = DateSerial(CInt(a(2)), CInt(a(1)), CInt(a(0))): Exit Function
bad:
    ParseDate = ""
End Function

Private Function DataReady() As Worksheet
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = Worksheets(SH_CLEAN)
    On Error GoTo 0
    If ws Is Nothing Then PrepareData: Set ws = Worksheets(SH_CLEAN)
    Set DataReady = ws
End Function

Private Function LastRow(ws As Worksheet) As Long
    LastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
End Function

Private Function RecreateSheet(nm As String) As Worksheet
    Application.DisplayAlerts = False
    On Error Resume Next
    Worksheets(nm).Delete
    On Error GoTo 0
    Application.DisplayAlerts = True
    Dim ws As Worksheet: Set ws = Worksheets.Add(After:=Worksheets(Worksheets.Count)): ws.Name = nm
    Set RecreateSheet = ws
End Function

Private Sub ClearAndHeader()
    Dim ws As Worksheet: Set ws = RecreateSheet(SH_FLAGS)
    ws.Range("A1:G1").Value = Array("SrcRow", "Date", "Document", "Amount", "Description", "Test", "Comment")
    flagRow = 2
End Sub

Private Sub WriteFlag(d As Worksheet, srcRow As Long, test As String, comment As String)
    Dim f As Worksheet: Set f = Worksheets(SH_FLAGS)
    If srcRow >= 2 Then
        f.Cells(flagRow, 1).Value = d.Cells(srcRow, cSrcRow).Value
        f.Cells(flagRow, 2).Value = d.Cells(srcRow, cDateText).Value
        f.Cells(flagRow, 3).Value = d.Cells(srcRow, cDoc).Value
        f.Cells(flagRow, 4).Value = d.Cells(srcRow, cAmount).Value
        f.Cells(flagRow, 5).Value = d.Cells(srcRow, cDesc).Value
    End If
    f.Cells(flagRow, 6).Value = test
    f.Cells(flagRow, 7).Value = comment
    flagRow = flagRow + 1
End Sub

Private Sub FormatFlags()
    Dim f As Worksheet: Set f = Worksheets(SH_FLAGS)
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
