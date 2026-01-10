# ChatSDK DevTools Extension Icons

This directory contains the icons for the ChatSDK DevTools Chrome extension.

## Icon Files

The extension requires three PNG icon sizes:
- `icon16.png` - 16×16px (shown in the extension toolbar)
- `icon48.png` - 48×48px (shown in extension management)
- `icon128.png` - 128×128px (shown in Chrome Web Store)

## Generating Icons

### From SVG (Recommended)

Use the provided `icon.svg` file to generate all required sizes:

```bash
# Using ImageMagick (install: brew install imagemagick)
convert -background none icon.svg -resize 16x16 icon16.png
convert -background none icon.svg -resize 48x48 icon48.png
convert -background none icon.svg -resize 128x128 icon128.png

# Or using Inkscape
inkscape icon.svg --export-type=png --export-width=16 --export-filename=icon16.png
inkscape icon.svg --export-type=png --export-width=48 --export-filename=icon48.png
inkscape icon.svg --export-type=png --export-width=128 --export-filename=icon128.png
```

### Using Online Tools

1. Open [CloudConvert](https://cloudconvert.com/svg-to-png) or similar
2. Upload `icon.svg`
3. Convert to PNG at each required size (16, 48, 128)
4. Save as `icon16.png`, `icon48.png`, `icon128.png`

### Using Design Tools

- **Figma/Sketch:** Import SVG, resize artboard, export as PNG
- **Photoshop:** Open SVG as Smart Object, resize, export

## Icon Design

The icon features:
- **Blue gradient background** - Represents the ChatSDK brand
- **White chat bubble** - Symbolizes messaging functionality
- **Debug wrench badge** - Indicates developer tools
- **Clean, modern design** - Fits Chrome's extension aesthetic

## For Development

If you don't have the PNG files yet, the extension will still load but won't show icons. Generate them before publishing to the Chrome Web Store.
