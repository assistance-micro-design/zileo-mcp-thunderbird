# Extension Icons

This directory contains the extension icons.

## Required Files

- `icon-48.png` - 48x48 pixel icon
- `icon-96.png` - 96x96 pixel icon

## Creating Icons from SVG

You can convert the provided `icon.svg` to PNG using:

```bash
# Using ImageMagick
convert -background none icon.svg -resize 48x48 icon-48.png
convert -background none icon.svg -resize 96x96 icon-96.png

# Or using Inkscape
inkscape icon.svg --export-png=icon-48.png --export-width=48 --export-height=48
inkscape icon.svg --export-png=icon-96.png --export-width=96 --export-height=96

# Or using rsvg-convert (librsvg)
rsvg-convert -w 48 -h 48 icon.svg > icon-48.png
rsvg-convert -w 96 -h 96 icon.svg > icon-96.png
```

## Design Notes

The icon combines:
- Thunderbird blue background (#0066CC)
- Stylized bird/thunderbolt symbol in white
- MCP circuit nodes in gold (#FFD700) representing the Model Context Protocol connection

## Temporary Workaround

If you don't have icon files yet, you can temporarily remove the `icons` section from `manifest.json` until the PNG files are created.
