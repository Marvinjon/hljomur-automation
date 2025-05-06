# AI and PNG File Combiner

This script combines an Adobe Illustrator (.ai) file with a PNG image, adding green background boxes behind the PNG to ensure proper printing. The script will:

1. Place the PNG on top of the AI file, centered and resized to fit
2. Add two green boxes behind the PNG (to ensure proper printing with transparent backgrounds)
3. Save the result as a new AI file

## Requirements

- Python 3.x
- Required Python packages:
  - PyPDF2
  - Pillow (PIL)
  - reportlab
  - PyMuPDF (fitz)

You can install the required packages with:

```
pip install PyPDF2 Pillow reportlab PyMuPDF
```

## Single File Usage

There are two ways to use this tool:

### 1. Using the Python script directly:

```
python3 combine_files.py [ai_file] [png_file] [output_file]
```

### 2. Using the shell script wrapper:

```
./combine_ai_png.sh [ai_file] [png_file] [output_file]
```

### Arguments:

- `ai_file`: Path to the source AI file (default: 1013_41266223_16x22cm.ai)
- `png_file`: Path to the PNG file to be embedded (default: 1013_41266223_16x22cm.png)
- `output_file`: Path to the output AI file (default: combined_output.ai)

If you run either script without arguments, it will use the default filenames.

## Batch Processing

The batch processing script can automatically find and combine all matching AI and PNG files in the current directory:

```
python3 batch_combine.py [output_directory]
```

- `output_directory`: Optional. The directory where combined files will be saved (default: "output")

The script looks for AI and PNG files with the same base name (e.g., "logo.ai" and "logo.png") and processes them automatically.

## Example

```
python3 combine_files.py template.ai logo.png output.ai
```

This will combine template.ai with logo.png and save the result as output.ai.

## Notes

- The PNG will be resized to fit within the AI file dimensions with a small margin.
- Two green boxes of slightly different shades will be added behind the PNG.
- The script preserves the original AI file and creates a new one with the combined content. 