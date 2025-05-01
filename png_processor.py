#!/usr/bin/env python3
import os
import sys
import argparse
import tempfile
from PIL import Image, ImageDraw
import cv2
import numpy as np

def detect_qr_and_album(png_file_path):
    """
    Detect the QR code and album cover regions in the PNG file.
    Returns tuple of (album_img, qr_img) PIL Image objects.
    """
    # Read the image
    img = cv2.imread(png_file_path)
    if img is None:
        raise ValueError(f"Could not read image: {png_file_path}")
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Try to detect QR code using a QR detector
    qr_detector = cv2.QRCodeDetector()
    retval, points = qr_detector.detect(gray)
    
    # Load original image with PIL for better quality
    pil_img = Image.open(png_file_path)
    
    # If QR code is detected
    if retval:
        print("QR Code detected!")
        # Get bounding rect for QR code
        qr_rect = cv2.boundingRect(points)
        qr_x, qr_y, qr_w, qr_h = qr_rect
        
        # Create a mask that removes the QR code region to find album cover
        mask = np.ones(gray.shape[:2], dtype=np.uint8) * 255
        mask[qr_y:qr_y+qr_h, qr_x:qr_x+qr_w] = 0
        
        # Find contours in the masked image
        masked_gray = cv2.bitwise_and(gray, gray, mask=mask)
        _, thresh = cv2.threshold(masked_gray, 150, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Find the largest contour (assumed to be the album cover)
            largest_contour = max(contours, key=cv2.contourArea)
            album_x, album_y, album_w, album_h = cv2.boundingRect(largest_contour)
            
            # Extract regions from the PIL image
            album_img = pil_img.crop((album_x, album_y, album_x + album_w, album_y + album_h))
            qr_img = pil_img.crop((qr_x, qr_y, qr_x + qr_w, qr_y + qr_h))
            
            return album_img, qr_img
    
    # If detection fails, use the whole image as album cover
    print("QR code detection failed or not applicable. Using the whole image for album cover.")
    return pil_img, None

def add_green_background(image, padding=10):
    """Add a green background behind an image."""
    if image.mode == 'RGBA':
        # If image has transparency, keep it
        mode = 'RGBA'
    else:
        mode = 'RGB'
    
    # Create a new image with green background
    width, height = image.size
    background = Image.new(mode, (width + 2*padding, height + 2*padding), (0, 128, 0))
    
    # Paste the original image on top
    background.paste(image, (padding, padding), image if mode == 'RGBA' else None)
    
    return background

def resize_image_proportional(image, max_width=None, max_height=None):
    """Resize an image while maintaining aspect ratio."""
    original_width, original_height = image.size
    
    # If neither max_width nor max_height is specified, return original
    if max_width is None and max_height is None:
        return image
    
    # Calculate the scaling factor
    width_scale = max_width / original_width if max_width else float('inf')
    height_scale = max_height / original_height if max_height else float('inf')
    scale_factor = min(width_scale, height_scale, 1.0)  # Don't enlarge images
    
    # Calculate new dimensions
    new_width = int(original_width * scale_factor)
    new_height = int(original_height * scale_factor)
    
    # Resize the image
    return image.resize((new_width, new_height), Image.LANCZOS)

def process_png(png_file_path, output_dir=None, padding=10, max_width=800, preserve_original=False):
    """
    Process a PNG file:
    1. Detect and extract album cover and QR code
    2. Add green backgrounds behind these elements
    3. Save as separate files and a combined file
    """
    # Setup output paths
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
    else:
        output_dir = os.path.dirname(png_file_path) or '.'
    
    basename = os.path.splitext(os.path.basename(png_file_path))[0]
    album_path = os.path.join(output_dir, f"{basename}_album.png")
    combined_path = os.path.join(output_dir, f"{basename}_processed.png")
    qr_path = None
    
    # Detect album cover and QR code
    album_img, qr_img = detect_qr_and_album(png_file_path)
    
    # Resize images for better handling if needed
    if max_width and not preserve_original:
        album_img = resize_image_proportional(album_img, max_width=max_width)
        if qr_img:
            # Make QR code proportional but not too big compared to album
            qr_ratio = min(1.0, album_img.width * 0.4 / qr_img.width)
            qr_img = resize_image_proportional(qr_img, 
                                              max_width=int(qr_img.width * qr_ratio),
                                              max_height=int(qr_img.height * qr_ratio))
    
    # Add green backgrounds
    album_with_bg = add_green_background(album_img, padding)
    album_with_bg.save(album_path)
    print(f"Saved album cover with green background: {album_path}")
    
    if qr_img:
        qr_path = os.path.join(output_dir, f"{basename}_qr.png")
        qr_with_bg = add_green_background(qr_img, padding)
        qr_with_bg.save(qr_path)
        print(f"Saved QR code with green background: {qr_path}")
        
        # Create a combined image with both elements
        album_width, album_height = album_with_bg.size
        qr_width, qr_height = qr_with_bg.size
        
        # Calculate the combined image size
        spacing = 30  # Space between elements
        combined_width = album_width + qr_width + spacing
        combined_height = max(album_height, qr_height)
        
        # Create a new image with white background
        combined_img = Image.new('RGB', (combined_width, combined_height), (255, 255, 255))
        
        # Place album cover on the left
        combined_img.paste(album_with_bg, (0, 0))
        
        # Place QR code next to album cover, vertically centered
        qr_y_pos = (combined_height - qr_height) // 2
        combined_img.paste(qr_with_bg, (album_width + spacing, qr_y_pos))
    else:
        # If no QR code, just use the album cover as the combined image
        combined_img = album_with_bg
    
    combined_img.save(combined_path)
    print(f"Saved combined processed image: {combined_path}")
    
    return {
        'album': album_path,
        'qr': qr_path,
        'combined': combined_path
    }

def main():
    parser = argparse.ArgumentParser(description="Process PNG files with album covers and QR codes")
    parser.add_argument("png_file", help="Path to the PNG file to process")
    parser.add_argument("--output", help="Directory to save output files (default: same as input)")
    parser.add_argument("--padding", type=int, default=10, help="Padding around images for green background (default: 10px)")
    parser.add_argument("--max-width", type=int, default=800, help="Maximum width for processed images (default: 800px)")
    parser.add_argument("--preserve-original", action="store_true", help="Preserve original image sizes (don't resize)")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.png_file):
        print(f"Error: PNG file '{args.png_file}' not found")
        return 1
    
    try:
        output_files = process_png(
            args.png_file, 
            args.output, 
            args.padding, 
            args.max_width, 
            args.preserve_original
        )
        print("\nProcessing completed successfully.")
        print("Output files:")
        for key, path in output_files.items():
            if path:
                print(f"- {key}: {path}")
        return 0
    except Exception as e:
        print(f"Error processing image: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 