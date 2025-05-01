#!/usr/bin/env python3
import os
import sys
import argparse
import glob
from automate_illustrator_advanced import automate_illustrator


def process_file_pair(ai_file, png_file):
    """Process a single AI/PNG file pair."""
    print(f"\nProcessing pair: {ai_file} + {png_file}")
    try:
        automate_illustrator(ai_file, png_file)
        return True
    except Exception as e:
        print(f"Error processing files: {e}")
        return False


def batch_process(input_dir, pattern_ai="*.ai", pattern_png="*.png", match_method="name"):
    """
    Process multiple AI/PNG file pairs.
    
    Args:
        input_dir: Directory containing AI and PNG files
        pattern_ai: Glob pattern for AI files
        pattern_png: Glob pattern for PNG files
        match_method: How to match AI and PNG files
                     "name" - Match by filename (without extension)
                     "sequence" - Match in order of discovery
    """
    # Get absolute path of input directory
    input_dir = os.path.abspath(input_dir)
    
    # Find all AI and PNG files matching the patterns
    ai_files = glob.glob(os.path.join(input_dir, pattern_ai))
    png_files = glob.glob(os.path.join(input_dir, pattern_png))
    
    print(f"Found {len(ai_files)} AI files and {len(png_files)} PNG files in {input_dir}")
    
    if not ai_files or not png_files:
        print("Error: No files found matching the patterns.")
        return False
    
    # Sort files by name for consistency
    ai_files.sort()
    png_files.sort()
    
    success_count = 0
    total_count = 0
    
    # Process files based on the matching method
    if match_method == "name":
        # Create a dictionary of PNG files by base name (without extension)
        png_dict = {os.path.splitext(os.path.basename(f))[0]: f for f in png_files}
        
        # Match AI files with PNG files by name
        for ai_file in ai_files:
            ai_base = os.path.splitext(os.path.basename(ai_file))[0]
            if ai_base in png_dict:
                total_count += 1
                if process_file_pair(ai_file, png_dict[ai_base]):
                    success_count += 1
            else:
                print(f"Warning: No matching PNG file found for {ai_file}")
    
    elif match_method == "sequence":
        # Match files in order (1st AI with 1st PNG, etc.)
        for ai_file, png_file in zip(ai_files, png_files):
            total_count += 1
            if process_file_pair(ai_file, png_file):
                success_count += 1
    
    else:
        print(f"Error: Invalid match method '{match_method}'")
        return False
    
    # Print summary
    print(f"\nProcessing complete: {success_count} of {total_count} file pairs processed successfully.")
    return success_count > 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Batch process AI and PNG files with Illustrator automation")
    parser.add_argument("input_dir", help="Directory containing AI and PNG files")
    parser.add_argument("--ai", default="*.ai", help="Glob pattern for AI files (default: *.ai)")
    parser.add_argument("--png", default="*.png", help="Glob pattern for PNG files (default: *.png)")
    parser.add_argument("--match", choices=["name", "sequence"], default="name",
                        help="Method to match AI and PNG files (default: name)")
    
    args = parser.parse_args()
    
    if not os.path.isdir(args.input_dir):
        print(f"Error: {args.input_dir} is not a valid directory")
        sys.exit(1)
    
    success = batch_process(args.input_dir, args.ai, args.png, args.match)
    sys.exit(0 if success else 1) 