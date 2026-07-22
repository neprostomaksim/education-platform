Attribute VB_Name = "Anonymize"
'==========================================================================
'  DATA ANONYMIZATION (smart)
'  Anonymize        - selected TEXT/ID cells -> tokens (names, companies, UNP, accounts).
'  AnonymizeAmounts - selected NUMERIC cells -> value * secret coefficient (stays a number,
'                     proportions preserved, so AI can still analyze amounts).
'  Restore          - token cells back to originals (map lookup).
'  UnscaleAmounts   - scaled amounts / coefficient -> originals.
'  ExportSafeCopy   - copy the active DATA sheet to a NEW workbook WITHOUT the "Map" sheet
'                     (safe file to give the AI; keep the original with "Map" local).
'  WARNING: never upload the "Map" sheet to any AI.
'  ASCII-only source: pastes correctly on any Windows locale.
'==========================================================================
Option Explicit

Sub Anonymize()
    Dim rng As Range, cell As Range, mapSheet As Worksheet
    Dim dict As Object, prefix As String, token As String
    Dim counter As Long, lastMapRow As Long, v As String

    If TypeName(Selection) <> "Range" Then
        MsgBox "Select TEXT/ID cells to anonymize (names, companies, UNP, accounts).", vbExclamation: Exit Sub
    End If
    Set rng = Selection

    prefix = InputBox("Token prefix (e.g. COMPANY, NAME, ACCOUNT, UNP):", "Anonymize text/IDs", "TK")
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

    MsgBox "Text/ID values anonymized: " & dict.Count & vbCrLf & _
           "Map is on sheet 'Map'. Do NOT upload it to any AI!", vbInformation
End Sub

Sub AnonymizeAmounts()
    Dim rng As Range, cell As Range, k As Double, cnt As Long
    If TypeName(Selection) <> "Range" Then
        MsgBox "Select the AMOUNT cells (numbers) to anonymize.", vbExclamation: Exit Sub
    End If
    Set rng = Selection
    k = GetCoefficient()
    For Each cell In rng.Cells
        If IsNumeric(cell.Value) And cell.Value <> "" Then
            cell.Value = Round(CDbl(cell.Value) * k, 2)
            cnt = cnt + 1
        End If
    Next cell
    MsgBox "Amounts scaled: " & cnt & vbCrLf & _
           "Secret coefficient (kept on 'Map'): " & k & vbCrLf & vbCrLf & _
           "Amounts stay NUMERIC and proportional, so the AI can analyze them." & vbCrLf & _
           "To read the AI's numeric results as real money - divide them by " & k & ".", vbInformation
End Sub

Sub UnscaleAmounts()
    Dim rng As Range, cell As Range, k As Double, cnt As Long
    If TypeName(Selection) <> "Range" Then
        MsgBox "Select the scaled amounts to restore.", vbExclamation: Exit Sub
    End If
    Set rng = Selection
    k = ReadCoefficient()
    If k <= 0 Then MsgBox "Coefficient not found on 'Map'.", vbExclamation: Exit Sub
    For Each cell In rng.Cells
        If IsNumeric(cell.Value) And cell.Value <> "" Then
            cell.Value = CDbl(cell.Value) / k
            cnt = cnt + 1
        End If
    Next cell
    MsgBox "Amounts restored: " & cnt, vbInformation
End Sub

Sub Restore()
    Dim rng As Range, cell As Range, mapSheet As Worksheet
    Dim dict As Object, i As Long, lastRow As Long, key As Variant

    If TypeName(Selection) <> "Range" Then
        MsgBox "Select the range with tokens to restore.", vbExclamation: Exit Sub
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

    MsgBox "Tokens restored from the map.", vbInformation
End Sub

Sub ExportSafeCopy()
    Dim src As Worksheet: Set src = ActiveSheet
    If LCase(src.Name) = "map" Then
        MsgBox "Switch to the DATA sheet first (not 'Map').", vbExclamation: Exit Sub
    End If
    src.Copy
    MsgBox "A NEW workbook with ONLY the anonymized data was created (no 'Map' sheet)." & vbCrLf & _
           "Save it and give THIS file to the AI." & vbCrLf & _
           "Keep your original file (with 'Map') on your computer only.", vbInformation
End Sub

Private Function GetCoefficient() As Double
    Dim ws As Worksheet: Set ws = GetMapSheet()
    If IsNumeric(ws.Range("D1").Value) And ws.Range("D1").Value > 0 Then
        GetCoefficient = ws.Range("D1").Value
    Else
        Randomize
        GetCoefficient = Int(Rnd * 800 + 150) / 100   ' 1.50 .. 9.49
        ws.Range("C1").Value = "Coefficient": ws.Range("D1").Value = GetCoefficient
    End If
End Function

Private Function ReadCoefficient() As Double
    On Error Resume Next
    ReadCoefficient = ThisWorkbook.Worksheets("Map").Range("D1").Value
    On Error GoTo 0
End Function

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
