Attribute VB_Name = "Sampling"
'==========================================================================
'  AUDIT SAMPLING from a population
'  Data on the FIRST sheet: A No | B Document | C Counterparty | D Amount.
'  Three methods: 1) all above threshold; 2) random N from the remainder;
'                 3) monetary (MUS, systematic by amount - larger more likely).
'  Run: Alt+F8 -> Sampling.  ASCII-only source (safe paste on any locale).
'==========================================================================
Option Explicit
Private Const COL_AMOUNT As Long = 4   ' amount column

Public Sub Sampling()
    Dim s As Worksheet: Set s = Worksheets(1)
    Dim last As Long: last = s.Cells(s.Rows.Count, 1).End(xlUp).Row
    If last < 2 Then MsgBox "Population is empty.", vbExclamation: Exit Sub

    Dim method As String
    method = InputBox("Sampling method:" & vbCrLf & _
        "1 - all above threshold (material items)" & vbCrLf & _
        "2 - random N from the remainder" & vbCrLf & _
        "3 - monetary MUS (n items)", "Audit sampling", "1")
    If method = "" Then Exit Sub

    Dim f As Worksheet: Set f = RecreateSheet("Sample_Result")
    f.Range("A1:E1").Value = Array("No", "Document", "Counterparty", "Amount", "Selection method")
    Dim fr As Long, r As Long: fr = 2

    Select Case Trim(method)
    Case "1"
        Dim thr As Double: thr = CDbl(Val(InputBox("Materiality threshold:", , "100000")))
        For r = 2 To last
            If Abs(NumVal(s.Cells(r, COL_AMOUNT).Value)) >= thr Then CopyRow s, r, f, fr, "All > threshold": fr = fr + 1
        Next r

    Case "2"
        Dim thr2 As Double: thr2 = CDbl(Val(InputBox("Sample from items BELOW threshold:", , "100000")))
        Dim n As Long: n = CLng(Val(InputBox("How many to select (N):", , "10")))
        Dim idx() As Long, cnt As Long: ReDim idx(1 To last): cnt = 0
        For r = 2 To last
            If Abs(NumVal(s.Cells(r, COL_AMOUNT).Value)) < thr2 Then cnt = cnt + 1: idx(cnt) = r
        Next r
        If n > cnt Then n = cnt
        Randomize
        Dim i As Long, j As Long, tmp As Long
        For i = cnt To 2 Step -1
            j = Int(Rnd * i) + 1
            tmp = idx(i): idx(i) = idx(j): idx(j) = tmp
        Next i
        For i = 1 To n
            CopyRow s, idx(i), f, fr, "Random": fr = fr + 1
        Next i

    Case "3"
        Dim nm As Long: nm = CLng(Val(InputBox("How many items to select (n):", , "12")))
        Dim total As Double: total = 0
        For r = 2 To last: total = total + Abs(NumVal(s.Cells(r, COL_AMOUNT).Value)): Next r
        If total <= 0 Or nm <= 0 Then MsgBox "No amounts for MUS.", vbExclamation: Exit Sub
        Dim interval As Double: interval = total / nm
        Randomize
        Dim target As Double: target = Rnd * interval
        Dim cum As Double: cum = 0
        For r = 2 To last
            cum = cum + Abs(NumVal(s.Cells(r, COL_AMOUNT).Value))
            Do While target <= cum And (fr - 2) < nm
                CopyRow s, r, f, fr, "MUS (monetary)": fr = fr + 1
                target = target + interval
            Loop
        Next r

    Case Else
        MsgBox "Unknown method. Enter 1, 2 or 3.", vbExclamation: Exit Sub
    End Select

    With f.Range("A1:E1")
        .Font.Bold = True: .Font.Color = vbWhite: .Interior.Color = RGB(79, 45, 127)
    End With
    f.Columns.AutoFit
    On Error Resume Next
    f.Rows("1:1").AutoFilter
    On Error GoTo 0
    f.Activate
    MsgBox "Items selected: " & (fr - 2), vbInformation, "Sample ready"
End Sub

Private Sub CopyRow(s As Worksheet, r As Long, f As Worksheet, fr As Long, method As String)
    f.Cells(fr, 1).Value = s.Cells(r, 1).Value
    f.Cells(fr, 2).Value = s.Cells(r, 2).Value
    f.Cells(fr, 3).Value = s.Cells(r, 3).Value
    f.Cells(fr, 4).Value = s.Cells(r, COL_AMOUNT).Value
    f.Cells(fr, 5).Value = method
End Sub

Private Function NumVal(v As Variant) As Double
    If IsNumeric(v) Then NumVal = CDbl(v) Else NumVal = 0
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
