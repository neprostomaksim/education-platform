Attribute VB_Name = "Reconcile"
'==========================================================================
'  RECONCILE TWO LISTS  (our ledger <-> counterparty statement)
'  FIRST sheet = ours, SECOND sheet = counterparty.
'  Layout on both: A Counterparty | B Document (key) | C Amount.
'  Match key = column B (document number).
'  Shows: amount mismatch, in ours not theirs, in theirs not ours.
'  Run: Alt+F8 -> Reconcile.  ASCII-only source (safe paste on any locale).
'==========================================================================
Option Explicit
Private Const TOL As Double = 0.01   ' mismatch threshold (edit per task, e.g. 1)

Public Sub Reconcile()
    Dim ours As Object, theirs As Object
    Set ours = LoadList(Worksheets(1))
    Set theirs = LoadList(Worksheets(2))
    If ours Is Nothing Or theirs Is Nothing Then Exit Sub

    Dim f As Worksheet: Set f = RecreateSheet("Recon_Result")
    f.Range("A1:F1").Value = Array("Document", "Counterparty", "Type", "Amount ours", "Amount theirs", "Difference")
    Dim fr As Long: fr = 2
    Dim matched As Long, mism As Long, notTheirs As Long, notOurs As Long

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
            If Abs(sO - sT) > TOL Then
                f.Cells(fr, 1).Value = k: f.Cells(fr, 2).Value = ours(k)(0)
                f.Cells(fr, 3).Value = "Amount mismatch"
                f.Cells(fr, 4).Value = sO: f.Cells(fr, 5).Value = sT
                f.Cells(fr, 6).Value = sO - sT: fr = fr + 1: mism = mism + 1
            Else
                matched = matched + 1
            End If
        ElseIf inO Then
            f.Cells(fr, 1).Value = k: f.Cells(fr, 2).Value = ours(k)(0)
            f.Cells(fr, 3).Value = "In ours, not in counterparty"
            f.Cells(fr, 4).Value = ours(k)(1): fr = fr + 1: notTheirs = notTheirs + 1
        Else
            f.Cells(fr, 1).Value = k: f.Cells(fr, 2).Value = theirs(k)(0)
            f.Cells(fr, 3).Value = "In counterparty, not in ours"
            f.Cells(fr, 5).Value = theirs(k)(1): fr = fr + 1: notOurs = notOurs + 1
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
    MsgBox "Matched: " & matched & vbCrLf & "Amount mismatches: " & mism & vbCrLf & _
           "In ours only: " & notTheirs & vbCrLf & _
           "In counterparty only: " & notOurs, vbInformation, "Reconciliation result"
End Sub

Private Function LoadList(ws As Worksheet) As Object
    If ws Is Nothing Then MsgBox "Sheet not found.", vbCritical: Exit Function
    Dim d As Object: Set d = CreateObject("Scripting.Dictionary")
    Dim last As Long, r As Long
    last = ws.Cells(ws.Rows.Count, 2).End(xlUp).Row
    For r = 2 To last
        Dim key As String: key = Trim(CStr(ws.Cells(r, 2).Value))
        If key <> "" Then
            Dim sum As Double: sum = 0
            If IsNumeric(ws.Cells(r, 3).Value) Then sum = CDbl(ws.Cells(r, 3).Value)
            If d.Exists(key) Then
                d(key) = Array(ws.Cells(r, 1).Value, d(key)(1) + sum)
            Else
                d(key) = Array(ws.Cells(r, 1).Value, sum)
            End If
        End If
    Next r
    Set LoadList = d
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
