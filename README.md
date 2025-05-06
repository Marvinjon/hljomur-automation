# Hljomur Automation

A set of tools for automating the processing of Adobe Illustrator files with PNG images for graphic design workflows.

## Overview

This project provides an automated workflow for processing Adobe Illustrator (.ai) files along with PNG images. It allows you to:

1. Convert regular PNG images to white silhouettes with transparency
2. Open AI files and make vector elements green
3. Place the original PNG and its white version in the AI file
4. Save the processed files to a designated folder

The automation is managed through a combination of Python scripts and Adobe Illustrator JSX scripts.

## Directory Structure

- `to_be_processed/` - Place your AI files and regular PNG files here
- `to_white/` - Contains white PNG silhouettes (generated automatically)
- `complete/` - Processed files are saved here (created automatically)
- `process_plaques.py` - Python script to create white silhouettes from PNG files
- `layer_merge_script.jsx` - Adobe Illustrator script to process the files
- `disable_script_warning.jsx` - Script to disable Adobe Illustrator security warnings
- `run_all.py` - Automation script to run both processing steps

## Setup

1. Clone this repository
2. Ensure you have Adobe Illustrator installed
3. Make sure Python 3.x and Pillow (PIL) are installed:
   ```
   pip install Pillow
   ```

## How to Use

### Method 1: Full Automation

1. Place your AI files and PNG files in the `to_be_processed/` folder
2. Run the automation script:
   ```
   python run_all.py
   ```
3. The script will:
   - Convert PNGs to white silhouettes in the `to_white/` folder
   - Launch Illustrator and open the JSX script
   - You'll need to manually confirm the script execution in Illustrator unless you run the one time script called disable_script_warning.jsx in illustraitor by going to file -> scripts -> other scripts
4. Processed files will be saved in the `complete/` folder

### Method 2: Step-by-Step

#### Step 1: Create White Silhouettes
```
python process_plaques.py
```
This will:
- Take PNG files from the current directory
- Create white silhouettes with preserved transparency
- Save them to the `to_white/` folder

#### Step 2: Process in Illustrator
1. Open Adobe Illustrator
2. Go to File > Scripts > Other Script...
3. Select `layer_merge_script.jsx`
4. The script will:
   - Find AI files and PNG files in the `to_be_processed/` folder
   - Find the corresponding white PNG files in the `to_white/` folder
   - Convert all vector elements to green
   - Place the white silhouette and original PNG
   - Save the processed file to the `complete/` folder

## Disable Illustrator Security Warnings

If you're tired of Illustrator's security warnings when running scripts:

1. Open Adobe Illustrator
2. Go to File > Scripts > Other Script...
3. Select `disable_script_warning.jsx`
4. Follow the prompts

This will disable the security warning dialog for future script executions.

## File Matching

The system matches files based on filenames:
- AI file: `example.ai`
- PNG file: `example.png`
- White PNG file: `example_white.png`

Files are matched intelligently, so partial name matches at the beginning of filenames will also work.

## Troubleshooting

- **Missing Files Error**: Ensure your files are in the correct folders and follow the naming conventions
- **Illustrator Script Errors**: Make sure you're running a compatible version of Illustrator
- **White PNGs Not Found**: Run the `process_plaques.py` script first to generate the white silhouettes

## Requirements

- Python 3.x
- Pillow (PIL) Python library
- Adobe Illustrator (tested with version 2025)
- macOS (for the run_all.py script, though the main functionality works on any OS)

## License

This project is available for use under the MIT license. 