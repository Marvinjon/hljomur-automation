#!/usr/bin/env python3
import os
import sys
from PIL import Image, ImageOps
import glob

def process_image(input_file):
    """
    Process a PNG file by:
    1. Creating a white silhouette of all non-transparent areas
    2. Saving it as a separate white version image with transparency preserved
    """
    # Output filename
    filename = os.path.basename(input_file)
    base_name = os.path.splitext(filename)[0]
    output_dir = 'to_white'
    output_file = os.path.join(output_dir, f"{base_name}_white.png")
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Open the original image with alpha channel
    original = Image.open(input_file)
    
    if original.mode != 'RGBA':
        original = original.convert('RGBA')
    
    # Get the dimensions
    width, height = original.size
    
    # Create a white silhouette by extracting the alpha mask and filling it with white
    # Extract just the alpha channel
    alpha_mask = original.split()[3]
    
    # Create a new transparent image
    white_version = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    
    # Create a white image
    white_image = Image.new('RGB', (width, height), (255, 255, 255))
    
    # Apply the alpha mask to the white image
    white_silhouette = Image.new('RGBA', (width, height))
    white_silhouette.paste(white_image, (0, 0))
    white_silhouette.putalpha(alpha_mask)
    
    # The white silhouette is our result
    white_version = white_silhouette
    
    # Save the white version with transparency
    white_version.save(output_file)
    print(f"Created white version of {input_file} -> {output_file}")
    return output_file

def process_all_images():
    """Process all PNG files in the to_be_processed directory."""
    input_dir = 'to_be_processed'
    png_files = glob.glob(os.path.join(input_dir, "*.png"))
    if not png_files:
        print(f"No PNG files found in the {input_dir} directory.")
        return
    
    for png_file in png_files:
        process_image(png_file)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        process_image(sys.argv[1])
    else:
        process_all_images() 