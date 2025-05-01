import os
import fitz  # PyMuPDF
from PIL import Image
import io
import tempfile
import shutil

# Define green color (RGB)
GREEN_COLOR = (0, 128, 0)  # You can adjust this to the specific green tone needed

def convert_ai_to_pdf(ai_file):
    """Copy AI file to a temporary PDF file (since AI files are PDF-based)"""
    temp_pdf = tempfile.mktemp(suffix='.pdf')
    shutil.copy(ai_file, temp_pdf)
    return temp_pdf

def colorize_pdf(input_pdf, output_pdf):
    """Change white elements in the PDF to green"""
    doc = fitz.open(input_pdf)
    for page_num in range(len(doc)):
        page = doc[page_num]
        
        # Get the page content as a display list
        dl = page.get_displaylist()
        
        # Convert display list to a pixmap (image)
        pix = dl.get_pixmap(alpha=True)
        
        # Convert pixmap to PIL Image
        img_data = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_data))
        
        # Replace white with green
        pixdata = img.load()
        width, height = img.size
        for y in range(height):
            for x in range(width):
                r, g, b, a = pixdata[x, y]
                # If it's white or close to white and not transparent
                if r > 200 and g > 200 and b > 200 and a > 0:
                    pixdata[x, y] = (*GREEN_COLOR, a)
        
        # Convert back to PDF
        img_bytes = io.BytesIO()
        img.save(img_bytes, format="PNG")
        img_bytes.seek(0)
        
        # Replace page content
        page.insert_image(page.rect, stream=img_bytes.getvalue())
    
    # Save as a new PDF
    doc.save(output_pdf)
    doc.close()

def combine_images_with_green_background(green_pdf, original_png, output_pdf):
    """Combine the colorized PDF and original PNG with a green background layer behind the PNG"""
    # Open the colorized AI PDF
    pdf_doc = fitz.open(green_pdf)
    pdf_page = pdf_doc[0]
    
    # Open the original PNG
    png_img = Image.open(original_png)
    png_width, png_height = png_img.size
    
    # Create a new PDF document
    new_doc = fitz.open()
    
    # New page dimensions should be max of both widths and sum of heights
    new_page = new_doc.new_page(width=max(pdf_page.rect.width, png_width),
                              height=pdf_page.rect.height + png_height)
    
    # Insert AI PDF content at the top
    new_page.show_pdf_page(fitz.Rect(0, 0, pdf_page.rect.width, pdf_page.rect.height), 
                          pdf_doc, 0)
    
    # Create a green background rectangle below the AI PDF content
    rect = fitz.Rect(0, pdf_page.rect.height, max(pdf_page.rect.width, png_width), 
                   pdf_page.rect.height + png_height)
    
    # Fill the rectangle with green color
    new_page.draw_rect(rect, color=(0/255, 128/255, 0/255), fill=(0/255, 128/255, 0/255))
    
    # Convert PNG to bytes
    png_bytes = io.BytesIO()
    png_img.save(png_bytes, format="PNG")
    png_bytes.seek(0)
    
    # Place the original PNG on top of the green background
    new_page.insert_image(
        fitz.Rect(0, pdf_page.rect.height, png_width, pdf_page.rect.height + png_height),
        stream=png_bytes.getvalue()
    )
    
    # Save the combined PDF
    new_doc.save(output_pdf)
    new_doc.close()
    pdf_doc.close()

def main():
    # Input files
    ai_file = "1013_41266223_16x22cm.ai"
    png_file = "1013_41266223_16x22cm.png"
    
    # Output files
    temp_pdf = convert_ai_to_pdf(ai_file)
    green_pdf = "green_ai.pdf"
    final_output = "improved_output.pdf"
    
    # Process files
    print("Converting AI to PDF...")
    
    print("Colorizing PDF (changing white to green)...")
    colorize_pdf(temp_pdf, green_pdf)
    
    print("Combining files with green background behind PNG...")
    combine_images_with_green_background(green_pdf, png_file, final_output)
    
    # Clean up temporary files
    os.remove(temp_pdf)
    
    print(f"Process completed. Result saved to {final_output}")

if __name__ == "__main__":
    main() 