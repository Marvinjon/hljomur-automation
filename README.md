# Hljomur Plaque Automation

This repository contains scripts to automate the processing of plaque designs for Hljomur using Adobe Illustrator.

## Overview

The automation process consists of three main parts:

1. **Creates vector**: Creates a yellowv vector that is the same size as the files in vector_reference_for_code folder
2. **Layer Merging**: Creates a three-layer structure in Adobe Illustrator:
   - Yellow Overlay (top layer, 1% opacity)
   - Original PNG (middle layer)
   - Vector Spot Color (bottom layer)
3. **Batch Processing**: Handles multiple files at once

## Requirements

- Python 3.6+ with PIL (Pillow) library
- Adobe Illustrator 2022 or newer
- macOS environment (for the `run_all.py` script)

## File Structure

- `to_be_processed/`: Place your original AI and PNG files here
- `to_white/`: Output folder for white PNG versions (created automatically)
- `complete/`: Output folder for processed Illustrator files (created automatically)
- `spotcolor.ai`: Reference file containing the spot color definition

## How to Use

### Option 1: Run Everything at Once

```bash
python3 run_all.py
```

This will:
1. Process all PNGs to create white versions
2. Launch Adobe Illustrator with the merge script

### Option 2: Run Individual Scripts

1. First, process PNG files:
```bash
python3 process_plaques.py
```

2. Then manually run the Illustrator script:
   - Open Adobe Illustrator
   - Go to File > Scripts > Other Script...
   - Select `layer_merge_script.jsx`

## How It Works

1. **PNG Processing**:
   - Takes PNG files from `to_be_processed/`
   - Creates white silhouettes preserving transparency
   - Saves them to `to_white/` with "_white" suffix

2. **Layer Merging**:
   - Creates a three-layer structure
   - Applies spot color to all vector content
   - Places the original PNG in the middle layer
   - Creates a yellow overlay layer (formerly "White Vector", now "Yellow Overlay") set to 1% opacity
   - Handles two size variants (13x18cm and 16x22cm)
   - Saves the processed file to the `complete/` folder

## Recent Changes

- Renamed "White Vector" layer to "Yellow Overlay" for clarity
- Yellow shapes are now used as overlays instead of white
- Various optimizations and bug fixes

## Troubleshooting

If you encounter errors:
- Check the `error_log.txt` file (created if errors occur)
- Ensure all required folders exist
- Verify that file names include size information (13x18 or 16x22)
- Make sure `spotcolor.ai` is present in the project root 