Add-Type -AssemblyName System.Drawing

function Get-Median([System.Collections.Generic.List[int]] $values) {
  $ordered = $values | Sort-Object
  return [int]$ordered[[int][Math]::Floor($ordered.Count / 2)]
}

function Test-BackgroundBlue([System.Drawing.Color] $color) {
  return (
    $color.A -ge 200 -and
    $color.B -ge 180 -and
    $color.B -gt ($color.G + 25) -and
    $color.G -gt ($color.R + 35) -and
    $color.R -lt 110
  )
}

function Convert-ToFullBleedIcon([string] $sourcePath, [string] $destinationPath) {
  $source = New-Object System.Drawing.Bitmap((Resolve-Path $sourcePath).Path)
  $output = New-Object System.Drawing.Bitmap(
    $source.Width,
    $source.Height,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )

  try {
    $rowBackgrounds = New-Object 'System.Drawing.Color[]' $source.Height
    $hasBackground = New-Object 'System.Boolean[]' $source.Height
    $leftEdges = New-Object 'System.Int32[]' $source.Height
    $rightEdges = New-Object 'System.Int32[]' $source.Height

    for ($y = 0; $y -lt $source.Height; $y++) {
      $reds = New-Object 'System.Collections.Generic.List[int]'
      $greens = New-Object 'System.Collections.Generic.List[int]'
      $blues = New-Object 'System.Collections.Generic.List[int]'
      $leftEdge = $source.Width
      $rightEdge = -1

      for ($x = 0; $x -lt $source.Width; $x++) {
        $pixel = $source.GetPixel($x, $y)
        if (Test-BackgroundBlue $pixel) {
          $reds.Add($pixel.R)
          $greens.Add($pixel.G)
          $blues.Add($pixel.B)
          $leftEdge = [Math]::Min($leftEdge, $x)
          $rightEdge = [Math]::Max($rightEdge, $x)
        }
      }

      if ($reds.Count -eq 0) {
        continue
      }

      $rowBackgrounds[$y] = [System.Drawing.Color]::FromArgb(
        255,
        (Get-Median $reds),
        (Get-Median $greens),
        (Get-Median $blues)
      )
      $hasBackground[$y] = $true
      $leftEdges[$y] = $leftEdge
      $rightEdges[$y] = $rightEdge
    }

    for ($y = 0; $y -lt $source.Height; $y++) {
      if ($hasBackground[$y]) {
        continue
      }

      for ($distance = 1; $distance -lt $source.Height; $distance++) {
        $above = $y - $distance
        $below = $y + $distance
        if ($above -ge 0 -and $hasBackground[$above]) {
          $rowBackgrounds[$y] = $rowBackgrounds[$above]
          $leftEdges[$y] = $source.Width
          $rightEdges[$y] = -1
          $hasBackground[$y] = $true
          break
        }
        if ($below -lt $source.Height -and $hasBackground[$below]) {
          $rowBackgrounds[$y] = $rowBackgrounds[$below]
          $leftEdges[$y] = $source.Width
          $rightEdges[$y] = -1
          $hasBackground[$y] = $true
          break
        }
      }

      if (!$hasBackground[$y]) {
        throw "No blue background samples found in $sourcePath"
      }
    }

    $edgeInset = [Math]::Max(2, [int][Math]::Round($source.Width / 90))

    for ($y = 0; $y -lt $source.Height; $y++) {
      $background = $rowBackgrounds[$y]

      for ($x = 0; $x -lt $source.Width; $x++) {
        $pixel = $source.GetPixel($x, $y)

        if (
          $rightEdges[$y] -lt 0 -or
          $x -le ($leftEdges[$y] + $edgeInset) -or
          $x -ge ($rightEdges[$y] - $edgeInset)
        ) {
          $output.SetPixel($x, $y, $background)
          continue
        }

        if ($pixel.A -ge 248) {
          $output.SetPixel(
            $x,
            $y,
            [System.Drawing.Color]::FromArgb(255, $pixel.R, $pixel.G, $pixel.B)
          )
          continue
        }

        $alpha = $pixel.A
        $inverseAlpha = 255 - $alpha
        $red = [int](($pixel.R * $alpha + $background.R * $inverseAlpha + 127) / 255)
        $green = [int](($pixel.G * $alpha + $background.G * $inverseAlpha + 127) / 255)
        $blue = [int](($pixel.B * $alpha + $background.B * $inverseAlpha + 127) / 255)
        $output.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $red, $green, $blue))
      }
    }

    $destination = Join-Path (Get-Location) $destinationPath
    $output.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "Generated $destinationPath from $sourcePath"
  }
  finally {
    $output.Dispose()
    $source.Dispose()
  }
}

Convert-ToFullBleedIcon 'public/apple-touch-icon-v2.png' 'public/apple-touch-icon-v3.png'
Convert-ToFullBleedIcon 'public/icon-v2-192.png' 'public/icon-v3-192.png'
Convert-ToFullBleedIcon 'public/icon-v2-512.png' 'public/icon-v3-512.png'
