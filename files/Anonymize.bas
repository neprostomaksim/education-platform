Attribute VB_Name = "Anonymize"
'==========================================================================
'  DATA ANONYMIZATION
'  Anonymize - selected range values -> tokens; map on sheet "Map".
'  Restore   - tokens back to originals (e.g. in an AI answer).
'  WARNING: do NOT upload sheet "Map" to any AI service.
'  ASCII-only source: pastes correctly on any Windows locale.
'==========================================================================
Option Explicit

Sub Anonymize()
    Dim rng As Range, cell As Range, mapSheet As Worksheet
    Dim dict As Object, prefix As String, token As String
    Dim counter As Long, lastMapRow As Long, v As String

    If TypeName(Selection) <> "Range" Then
        MsgBox "Select a range of cells to anonymize.", vbExclamation: Exit Sub
    End If
    Set rng = Selection

    prefix = InputBox("Token prefix (e.g. COMPANY, NAME, ACCOUNT):", "Anonymize", "TK")
    If prefix = "" Then Exit Sub

    Set dict = CreateObject("Scripting.Dictionary")
    Set mapSheet = GetMapSheet()
    lastMapRow = mapSheet.Cells(mapSheet.Rows.Count, 1).End(xlUp).Row
    counter = 1

    For Each cell In rng.Cells
        v = Trim(CStr(cell.Value))
        If v <> "" Then
            If Not dict.Exists(v) Then
                token = prefix & "_" & Format(counter, "000")
                dict.Add v, token
                counter = counter + 1
                lastMapRow = lastMapRow + 1
                mapSheet.Cells(lastMapRow, 1).Value = token
                mapSheet.Cells(lastMapRow, 2).Value = v
            End If
            cell.Value = dict(v)
        End If
    Next cell

    MsgBox "Unique values anonymized: " & dict.Count & vbCrLf & _
           "Map is on sheet 'Map'. Do NOT upload it to any AI!", vbInformation
End Sub

Sub Restore()
    Dim rng As Range, cell As Range, mapSheet As Worksheet
    Dim dict As Object, i As Long, lastRow As Long, key As Variant

    If TypeName(Selection) <> "Range" Then
        MsgBox "Select a range with tokens.", vbExclamation: Exit Sub
    End If
    Set rng = Selection

    On Error Resume Next
    Set mapSheet = ThisWorkbook.Worksheets("Map")
    On Error GoTo 0
    If mapSheet Is Nothing Then MsgBox "Sheet 'Map' not found.", vbExclamation: Exit Sub

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

    MsgBox "Data restored from the map.", vbInformation
End Sub

Private Function GetMapSheet() As Worksheet
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets("Map")
    On Error GoTo 0
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
        ws.Name = "Map"
        ws.Cells(1, 1).Value = "Token": ws.Cells(1, 2).Value = "Original"
    End If
    Set GetMapSheet = ws
End Function
