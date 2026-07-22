Attribute VB_Name = "TB_Check"
'==========================================================================
'  TRIAL BALANCE ARITHMETIC CHECK (turnover-balance sheet)
'  Data on the FIRST sheet: A Code | B Name | D/E opening Dr/Cr |
'                           F/G turnover Dr/Cr | H/I closing Dr/Cr.
'  Flags: row imbalance, synthetic totals not balancing, empty rows, two-sided balance.
'  Run: Alt+F8 -> TB_Check.  ASCII-only source (safe paste on any locale).
'==========================================================================
Option Explicit
Private Const TOL As Double = 0.01   ' rounding tolerance

Public Sub TB_Check()
    Dim s As Worksheet: Set s = Worksheets(1)
    Dim hCode As String: hCode = ChrW(1050) & ChrW(1086) & ChrW(1076)  ' builds Cyrillic header "Kod"
    Dim hdr As Long, lastR As Long, r As Long
    lastR = s.Cells(s.Rows.Count, 1).End(xlUp).Row
    For r = 1 To lastR
        If Trim(CStr(s.Cells(r, 1).Value)) = hCode Then hdr = r: Exit For
    Next r
    If hdr = 0 Then MsgBox "Header row not found (cell 'Kod').", vbCritical: Exit Sub

    Dim f As Worksheet: Set f = RecreateSheet("TB_Flags")
    f.Range("A1:E1").Value = Array("Code", "Name", "Type", "Comment", "Difference")
    Dim fr As Long: fr = 2
    Dim synTotal As Double: synTotal = 0
    Dim cnt As Long

    For r = hdr + 1 To lastR
        Dim code As String: code = Trim(CStr(s.Cells(r, 1).Value))
        If code <> "" Then
            cnt = cnt + 1
            Dim nn As Double, no As Double, nk As Double
            nn = NetVal(s, r, 4, 5): no = NetVal(s, r, 6, 7): nk = NetVal(s, r, 8, 9)
            If nn = 0 And no = 0 And nk = 0 Then
                WriteFlag f, fr, s, r, "Empty row", "No balance and no turnover", 0
                fr = fr + 1
            Else
                Dim diff As Double: diff = nk - (nn + no)
                If Abs(diff) > TOL Then
                    WriteFlag f, fr, s, r, "Row imbalance", "Closing <> Opening + Turnover", diff: fr = fr + 1
                End If
                If NumVal(s.Cells(r, 8).Value) <> 0 And NumVal(s.Cells(r, 9).Value) <> 0 Then
                    WriteFlag f, fr, s, r, "Two-sided balance", "Closing both Dr and Cr", 0: fr = fr + 1
                End If
            End If
            If InStr(code, ".") = 0 Then synTotal = synTotal + nk
        End If
    Next r

    If Abs(synTotal) > TOL Then
        f.Cells(fr, 1).Value = "-"
        f.Cells(fr, 3).Value = "Balance mismatch"
        f.Cells(fr, 4).Value = "Sum of closing balances by synthetic accounts <> 0"
        f.Cells(fr, 5).Value = synTotal
        fr = fr + 1
    End If

    With f.Range("A1:E1")
        .Font.Bold = True: .Font.Color = vbWhite: .Interior.Color = RGB(79, 45, 127)
    End With
    f.Columns.AutoFit
    On Error Resume Next
    f.Rows("1:1").AutoFilter
    On Error GoTo 0
    f.Activate
    MsgBox "Accounts checked: " & cnt & vbCrLf & "Flags: " & (fr - 2) & vbCrLf & _
           "Synthetic balance: " & Format(synTotal, "# ##0.00") & _
           IIf(Abs(synTotal) > TOL, " - MISMATCH!", " - ok"), vbInformation
End Sub

Private Function NetVal(s As Worksheet, r As Long, cD As Long, cK As Long) As Double
    NetVal = NumVal(s.Cells(r, cD).Value) - NumVal(s.Cells(r, cK).Value)
End Function

Private Function NumVal(v As Variant) As Double
    If IsNumeric(v) Then NumVal = CDbl(v) Else NumVal = 0
End Function

Private Sub WriteFlag(f As Worksheet, fr As Long, s As Worksheet, r As Long, _
                     tp As String, comm As String, dif As Double)
    f.Cells(fr, 1).Value = s.Cells(r, 1).Value
    f.Cells(fr, 2).Value = s.Cells(r, 2).Value
    f.Cells(fr, 3).Value = tp
    f.Cells(fr, 4).Value = comm
    If dif <> 0 Then f.Cells(fr, 5).Value = dif
End Sub

Private Function RecreateSheet(nm As String) As Worksheet
    Application.DisplayAlerts = False
    On Error Resume Next
    Worksheets(nm).Delete
    On Error GoTo 0
    Application.DisplayAlerts = True
    Dim ws As Worksheet: Set ws = Worksheets.Add(After:=Worksheets(Worksheets.Count)): ws.Name = nm
    Set RecreateSheet = ws
End Function
