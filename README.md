# Image Processing Automation

This repository contains scripts to automate the process of adding green backgrounds behind album covers and QR codes in PNG images. There are two approaches available:

1. **Illustrator-based**: Uses Adobe Illustrator for processing (requires macOS and Illustrator)
2. **Pure Python**: Processes images using only Python libraries (works on any platform)

## Requirements

### For Illustrator-based approach
- macOS (scripts use AppleScript to control Adobe Illustrator)
- Adobe Illustrator installed
- Python 3.6+
- Required Python packages:
  - Pillow (PIL)
  - OpenCV (cv2)
  - NumPy

### For Pure Python approach
- Any operating system (Windows, macOS, Linux)
- Python 3.6+
- Required Python packages:
  - Pillow (PIL)
  - OpenCV (cv2)
  - NumPy
  - ReportLab (only needed for PDF output)

## Installation

1. Clone this repository or download the scripts
2. Install the required Python packages:

```bash
# For Illustrator-based approach
pip install pillow opencv-python numpy

# For Pure Python approach
pip install pillow opencv-python numpy reportlab
```

3. If using the Illustrator-based approach, run the environment test script to verify your setup:

```bash
python test_environment.py
```

## Scripts

### Pure Python Image Processing

#### 1. PNG Processor (`png_processor.py`)

This script processes PNG files directly without requiring Adobe Illustrator:

```bash
python png_processor.py path/to/image.png [--output OUTPUT_DIR] [--padding PADDING]
```

Options:
- `--output`: Directory to save output files (default: same as input)
- `--padding`: Padding around images for green background in pixels (default: 10)

Output:
- `[basename]_album.png`: Album cover with green background
- `[basename]_qr.png`: QR code with green background (if detected)
- `[basename]_processed.png`: Combined image with both elements

#### 2. Illustrator-free Processing (`no_illustrator.py`)

This script creates PDF files with the PNG elements and green backgrounds:

```bash
python no_illustrator.py path/to/file.ai path/to/image.png [--output OUTPUT_FILE]
```

Note: The AI file is only used for naming the output; it is not processed.

#### 3. Batch Processing without Illustrator (`batch_no_illustrator.py`)

Process multiple files without using Adobe Illustrator:

```bash
python batch_no_illustrator.py path/to/directory [--output OUTPUT_DIR] [--match {name,sequence}]
```

Options:
- `--output`: Directory to save output files (default: same as input)
- `--ai`: Glob pattern for AI files (default: "*.ai")
- `--png`: Glob pattern for PNG files (default: "*.png")
- `--match`: Method to match AI and PNG files (default: "name")

### Illustrator-based Processing

#### 1. Basic Script (`automate_illustrator.py`)

This script takes an AI file and a PNG file, and places the PNG on top of the AI file with a green background.

```bash
python automate_illustrator.py path/to/file.ai path/to/image.png
```

#### 2. Advanced Script (`automate_illustrator_advanced.py`)

This script detects album cover and QR code in the input PNG file, separates them, and places them individually on the AI file with green backgrounds.

```bash
python automate_illustrator_advanced.py path/to/file.ai path/to/image.png
```

#### 3. Batch Processing with Illustrator (`batch_process.py`)

This script allows you to process multiple AI and PNG file pairs at once.

```bash
python batch_process.py path/to/directory [--match {name,sequence}]
```

#### 4. Environment Test Script (`test_environment.py`)

This script checks if your environment is properly set up for running the Illustrator automation scripts.

```bash
python test_environment.py
```

## How It Works

### Pure Python Approach

1. **PNG Processor**:
   - Detects and extracts album cover and QR code regions from the PNG
   - Adds green backgrounds behind each element
   - Creates separate images and a combined image
   - Works on any operating system

2. **PDF Creation**:
   - Similar to PNG processor but outputs PDF files
   - Uses ReportLab for PDF generation
   - Places PNG elements on a PDF with green backgrounds

### Illustrator-based Approach

1. **Basic Script**:
   - Opens the AI file in Illustrator
   - Places the PNG file on top
   - Creates a green box behind the PNG
   - Saves the result as a new AI file

2. **Advanced Script**:
   - Opens the AI file in Illustrator
   - Uses OpenCV to detect and separate the album cover and QR code in the PNG
   - Places each element separately on the AI file
   - Creates green boxes behind each element
   - Positions the elements appropriately
   - Saves the result as a new AI file

## Customization

You can adjust the following parameters in the scripts:

- Green color: Change the RGB values in the script (currently set to `(0, 128, 0)`)
- Element positioning: Modify the coordinates in the positioning sections
- Padding: Adjust the padding around elements (for pure Python scripts)
- Thresholds for image detection: Adjust values in the `detect_qr_and_album` function

## Troubleshooting

### For Pure Python scripts
- **Image detection issues**: If QR or album detection fails, the script will fall back to using the whole image
- **Package installation errors**: Make sure you have the latest version of pip and try reinstalling the packages

### For Illustrator scripts
- **Illustrator not responding**: Make sure Illustrator is not minimized and doesn't have any dialog boxes open
- **AppleScript errors**: Check the error messages printed by the script for clues about what went wrong
- **Batch processing errors**: The batch script will continue processing other files even if one pair fails

## Notes

- The Illustrator-based scripts require Illustrator to be visible on screen while running
- The pure Python scripts work on any platform without additional software
- For batch processing, it's recommended to have a dedicated directory with only the files you want to process 