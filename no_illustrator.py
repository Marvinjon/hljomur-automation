#!/usr/bin/env python3
import os
import sys
import argparse
import tempfile
from PIL import Image, ImageDraw
import cv2
import numpy as np
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import green

def detect_qr_and_album(png_file_path):
    """
    Detect the QR code and album cover regions in the PNG file.
    Returns tuple of coordinates and sizes: (album_coords, qr_coords)
    Where each coord is (x, y, width, height)
    """
    # Read the image
    img = cv2.imread(png_file_path)
    if img is None:
        raise ValueError(f"Could not read image: {png_file_path}")
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Try to detect QR code using a QR detector
    qr_detector = cv2.QRCodeDetector()
    retval, points = qr_detector.detect(gray)
    
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
            album_rect = cv2.boundingRect(largest_contour)
            
            return album_rect, qr_rect
    
    # If detection fails, use the whole image as album cover
    print("QR code detection failed or not applicable. Using the whole image for album cover.")
    height, width = img.shape[:2]
    return (0, 0, width, height), None

def process_images(ai_file_path, png_file_path, output_path=None):
    """
    Process the PNG and AI files without using Illustrator:
    1. Extract album cover and QR code regions from PNG
    2. Create a PDF with green backgrounds behind these elements
    3. Save the result to output path
    """
    # Default output path if not specified
    if not output_path:
        output_path = os.path.splitext(ai_file_path)[0] + "_modified.pdf"
    
    # Load the PNG image
    png_image = Image.open(png_file_path)
    img_width, img_height = png_image.size
    
    # Detect album cover and QR code regions
    album_rect, qr_rect = detect_qr_and_album(png_file_path)
    album_x, album_y, album_w, album_h = album_rect
    
    # Extract album cover region
    album_cover = png_image.crop((album_x, album_y, album_x + album_w, album_y + album_h))
    
    # Extract QR code region if detected
    qr_code = None
    if qr_rect:
        qr_x, qr_y, qr_w, qr_h = qr_rect
        qr_code = png_image.crop((qr_x, qr_y, qr_x + qr_w, qr_y + qr_h))
    
    # Create a new PDF with A4 size
    page_width, page_height = A4
    c = canvas.Canvas(output_path, pagesize=A4)
    
    # Calculate scale to fit the image properly on the page
    # We'll use a maximum of 80% of the page width for the elements
    max_width = page_width * 0.8
    scale_factor = min(1.0, max_width / (img_width if not qr_rect else (album_w + qr_w + 50)))
    
    # Calculate positions and dimensions for album cover
    album_scaled_w = album_w * scale_factor
    album_scaled_h = album_h * scale_factor
    
    # Position album cover centered at the top of the page with margin
    margin_top = 50
    margin_left = (page_width - album_scaled_w) / 2 if not qr_rect else page_width * 0.1
    album_pos_x = margin_left
    album_pos_y = page_height - margin_top - album_scaled_h
    
    # Draw green rectangle as background for album cover
    c.setFillColor(green)
    c.rect(album_pos_x - 5, album_pos_y - 5, album_scaled_w + 10, album_scaled_h + 10, fill=1, stroke=0)
    
    # Save album cover to temporary file and place on PDF
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as album_temp:
        album_cover.save(album_temp.name)
        c.drawImage(album_temp.name, album_pos_x, album_pos_y, width=album_scaled_w, height=album_scaled_h)
    
    # If QR code was detected, add it to the PDF
    if qr_code:
        # Calculate position and size for QR code
        qr_scaled_w = qr_w * scale_factor
        qr_scaled_h = qr_h * scale_factor
        
        # Position QR code to the right of album cover
        qr_pos_x = album_pos_x + album_scaled_w + 30
        qr_pos_y = album_pos_y + (album_scaled_h - qr_scaled_h) / 2  # Vertically aligned with album
        
        # Draw green rectangle as background for QR code
        c.setFillColor(green)
        c.rect(qr_pos_x - 5, qr_pos_y - 5, qr_scaled_w + 10, qr_scaled_h + 10, fill=1, stroke=0)
        
        # Save QR code to temporary file and place on PDF
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as qr_temp:
            qr_code.save(qr_temp.name)
            c.drawImage(qr_temp.name, qr_pos_x, qr_pos_y, width=qr_scaled_w, height=qr_scaled_h)
    
    # Finalize the PDF
    c.save()
    
    # Clean up temporary files
    if os.path.exists(album_temp.name):
        os.unlink(album_temp.name)
    if qr_code and os.path.exists(qr_temp.name):
        os.unlink(qr_temp.name)
    
    print(f"Successfully created: {output_path}")
    return output_path

def main():
    parser = argparse.ArgumentParser(description="Process PNG and AI files without Illustrator")
    parser.add_argument("ai_file", help="Path to the reference AI file (only used for naming)")
    parser.add_argument("png_file", help="Path to the PNG file containing album cover and QR code")
    parser.add_argument("--output", help="Path to save the output PDF file (default: original_name_modified.pdf)")
    parser.add_argument("--scale", type=float, default=1.0, help="Scale factor for the images (default: 1.0)")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.png_file):
        print(f"Error: PNG file '{args.png_file}' not found")
        return 1
    
    try:
        output_file = process_images(args.ai_file, args.png_file, args.output)
        print(f"Process completed successfully. Output saved to: {output_file}")
        return 0
    except Exception as e:
        print(f"Error processing images: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 