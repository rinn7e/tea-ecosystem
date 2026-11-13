$Init = {
    [PSCustomObject]@{ Model = [PSCustomObject]@{ Count = 0 }; Cmd = $null }
}

$Update = {
    param($Msg, $Model)
    switch ($Msg.Key) {
        'UpArrow' { [PSCustomObject]@{ Model = [PSCustomObject]@{ Count = $Model.Count + 1 }; Cmd = $null } }
        'Q'       { [PSCustomObject]@{ Model = $Model; Cmd = [PSCustomObject]@{ Type = 'Quit' } } }
        default   { [PSCustomObject]@{ Model = $Model; Cmd = $null } }
    }
}

$View = {
    param($Model)
    TeaBox -Children @(
        TeaText -Content " Count: $($Model.Count) "
        TeaText -Content ' [Up] inc  [Q] quit' -Style (TeaStyle -Foreground 'BrightBlack')
    )
}

TeaProgram -InitFn $Init -UpdateFn $Update -ViewFn $View
