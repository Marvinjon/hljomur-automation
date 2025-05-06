#!/usr/bin/env python3
"""
Batch processor for combining multiple AI files with corresponding PNG files.
This script looks for matching AI and PNG files in the current directory,
and combines them using the combine_files.py script.
"""

import os
import sys
import glob
import subprocess
import re

# Import the combine function from our main script
from combine_files import combine_ai_with_png

def find_matching_files():
    """Find all AI files and their matching PNG files in the current directory."""
    ai_files = glob.glob("*.ai")
    png_files = glob.glob("*.png")
    
    matches = []
    for ai_file in ai_files:
        # Get base name without extension
        base_name = os.path.splitext(ai_file)[0]
        
        # Look for matching PNG file
        matching_png = f"{base_name}.png"
        if matching_png in png_files:
            matches.append((ai_file, matching_png))
    
    return matches

def process_all_files(output_dir="output"):
    """Process all matching AI and PNG files."""
    matches = find_matching_files()
    
    if not matches:
        print("No matching AI and PNG files found.")
        return False
    
    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    print(f"Found {len(matches)} matching file pairs to process.")
    print("=" * 50)
    
    for ai_file, png_file in matches:
        base_name = os.path.splitext(ai_file)[0]
        output_file = os.path.join(output_dir, f"{base_name}_combined.ai")
        
        print(f"Processing: {ai_file} + {png_file} -> {output_file}")
        
        try:
            combine_ai_with_png(ai_file, png_file, output_file)
            print(f"✅ Success: {output_file}")
        except Exception as e:
            print(f"❌ Error processing {ai_file} and {png_file}: {str(e)}")
        
        print("-" * 50)
    
    print("Batch processing complete!")
    print(f"Output files saved in: {os.path.abspath(output_dir)}")
    return True

if __name__ == "__main__":
    # Get output directory from command line if provided
    output_dir = sys.argv[1] if len(sys.argv) > 1 else "output"
    process_all_files(output_dir) 