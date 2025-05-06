#!/usr/bin/env python3
import os
import sys
import PyPDF2
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.colors import green
from reportlab.lib.units import inch
import fitz  # PyMuPDF

def combine_ai_with_png(ai_file, png_file, output_file):
    """
    Combine an AI file with a PNG file:
    1. Extract dimensions from the AI file
    2. Create a new PDF with green background boxes
    3. Place the resized PNG image on top
    4. Save the result as a new AI file
    """
    print(f"Processing {ai_file} and {png_file}...")
    
    # Get AI file dimensions
    pdf_reader = PyPDF2.PdfReader(ai_file)
    page = pdf_reader.pages[0]
    ai_width = float(page.mediabox.width)
    ai_height = float(page.mediabox.height)
    
    print(f"AI dimensions: {ai_width} x {ai_height} points")
    
    # Get PNG dimensions and create a resized version
    png_img = Image.open(png_file)
    png_width, png_height = png_img.size
    
    print(f"Original PNG dimensions: {png_width} x {png_height} pixels")
    
    # Calculate scaling to fit within AI dimensions (with some margin)
    margin = 20  # points margin
    width_ratio = (ai_width - margin*2) / png_width
    height_ratio = (ai_height - margin*2) / png_height
    scale_ratio = min(width_ratio, height_ratio)
    
    new_width = int(png_width * scale_ratio)
    new_height = int(png_height * scale_ratio)
    
    print(f"Resized PNG dimensions: {new_width} x {new_height} points")
    
    # Create a temporary resized PNG
    resized_png = "temp_resized.png"
    png_img_resized = png_img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    png_img_resized.save(resized_png)
    
    # Calculate centering position
    x_offset = (ai_width - new_width) / 2
    y_offset = (ai_height - new_height) / 2
    
    # Create temporary PDF with green background boxes
    temp_pdf = "temp_background.pdf"
    c = canvas.Canvas(temp_pdf, pagesize=(ai_width, ai_height))
    
    # Draw two green boxes (slightly smaller than the PNG dimensions)
    box_margin = 10  # points margin for boxes
    
    # First green box (slightly larger)
    c.setFillColor(green)
    c.rect(
        x_offset - box_margin,
        y_offset - box_margin,
        new_width + 2*box_margin,
        new_height + 2*box_margin,
        fill=1, stroke=0
    )
    
    # Second green box (slightly smaller)
    lighter_green = (0, 0.9, 0, 0.8)  # RGBA: slightly lighter and more transparent green
    c.setFillColor(lighter_green)
    c.rect(
        x_offset - box_margin/2,
        y_offset - box_margin/2,
        new_width + box_margin,
        new_height + box_margin,
        fill=1, stroke=0
    )
    
    c.save()
    
    # Now let's combine everything using PyMuPDF (more flexible than PyPDF2 for this task)
    
    # First, we'll create a new PDF with the exact same dimensions as the AI file
    pdf_output = fitz.open()
    
    # Load the original AI file
    ai_doc = fitz.open(ai_file)
    pdf_output.insert_pdf(ai_doc)
    
    # Load the green background
    bg_doc = fitz.open(temp_pdf)
    
    # Get the first page of our new document
    page = pdf_output[0]
    
    # Add the green background
    page.show_pdf_page(page.rect, bg_doc, 0)
    
    # Add the PNG image
    img_rect = fitz.Rect(x_offset, y_offset, x_offset + new_width, y_offset + new_height)
    page.insert_image(img_rect, filename=resized_png)
    
    # Save the combined file
    pdf_output.save(output_file)
    
    # Clean up temporary files
    ai_doc.close()
    bg_doc.close()
    pdf_output.close()
    os.remove(temp_pdf)
    os.remove(resized_png)
    
    print(f"Successfully created {output_file}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        # If arguments aren't provided, use default filenames
        ai_file = "1013_41266223_16x22cm.ai"
        png_file = "1013_41266223_16x22cm.png"
        output_file = "combined_output.ai"
    else:
        ai_file = sys.argv[1]
        png_file = sys.argv[2]
        output_file = sys.argv[3] if len(sys.argv) > 3 else "combined_output.ai"
    
    combine_ai_with_png(ai_file, png_file, output_file) 