#!/bin/bash
# combine_ai_png.sh - Wrapper script for combine_files.py
# 
# This script combines an AI file with a PNG file, adding green background boxes

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not found."
    exit 1
fi

# Check if the required packages are installed
python3 -c "import PyPDF2, PIL, reportlab, fitz" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing required Python packages..."
    pip install PyPDF2 Pillow reportlab PyMuPDF
fi

# Show usage info if no arguments provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 [ai_file] [png_file] [output_file]"
    echo ""
    echo "If no arguments provided, will use default files:"
    echo "  - AI file: 1013_41266223_16x22cm.ai"
    echo "  - PNG file: 1013_41266223_16x22cm.png"
    echo "  - Output: combined_output.ai"
    echo ""
    read -p "Continue with default files? (y/n): " choice
    if [[ "$choice" != "y" && "$choice" != "Y" ]]; then
        exit 0
    fi
    python3 combine_files.py
else
    # Run with provided arguments
    python3 combine_files.py "$@"
fi

# Check if the script executed successfully
if [ $? -eq 0 ]; then
    echo "✅ File combination completed successfully!"
    if [ $# -eq 0 ]; then
        echo "Output saved as: combined_output.ai"
    elif [ $# -eq 3 ]; then
        echo "Output saved as: $3"
    else
        echo "Output saved as: combined_output.ai"
    fi
else
    echo "❌ Error: File combination failed."
    exit 1
fi 