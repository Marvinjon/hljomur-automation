# Plaque Image Processor

This project contains Python scripts to prepare files for printing on a see-through plaque. The scripts perform these operations:

1. Combine AI and PNG files
2. Convert white components in the AI file to green
3. Add a green background behind the PNG file (not modifying the PNG itself)

## Prerequisites

Before running the scripts, ensure you have Python installed and the required libraries:

```
pip install pillow pymupdf
```

## Available Scripts

### Original Scripts

#### `combine_and_colorize.py` and `combine_side_by_side.py`

These scripts modify both the AI file (converting white to green) and the PNG file (adding a green background to it).

### Fixed Scripts (Recommended)

#### 1. `combine_and_colorize_fixed.py`

This improved script:
- Converts the AI file to PDF
- Changes white elements in the AI file to green
- Keeps the PNG file intact (unmodified)
- Creates a green background layer behind the PNG image
- Combines both by stacking them vertically

To run:
```
python combine_and_colorize_fixed.py
```

Output: `improved_output.pdf`

#### 2. `combine_side_by_side_fixed.py`

This improved script:
- Converts the AI file to PDF
- Changes white elements in the AI file to green
- Keeps the PNG file intact (unmodified)
- Creates a green background layer behind the PNG image
- Combines both by placing them side by side

To run:
```
python combine_side_by_side_fixed.py
```

Output: `improved_side_by_side.pdf`

## Customization

You can adjust the green color by modifying the `GREEN_COLOR` variable at the top of each script. The default is `(0, 128, 0)`, which is a medium green. For a different shade, change these RGB values.

## For Printing

The resulting PDF files are designed for printing on transparent plaque material, with green areas showing through when installed. These scripts are compatible with an R2000 printer. 