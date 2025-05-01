#!/usr/bin/env python3
import os
import subprocess
import sys
import argparse
import tempfile
from PIL import Image
import cv2
import numpy as np


def run_applescript(script):
    """Execute an AppleScript command and return the result."""
    process = subprocess.Popen(
        ['osascript', '-e', script],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    stdout, stderr = process.communicate()
    if process.returncode != 0:
        print(f"Error executing AppleScript: {stderr.decode('utf-8')}")
        return None
    return stdout.decode('utf-8').strip()


def detect_qr_and_album(png_file_path):
    """
    Detect the QR code and album cover regions in the PNG file.
    Returns tuple of (album_cover_file, qr_code_file) temporary files.
    """
    # Read the image
    img = cv2.imread(png_file_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Try to detect QR code using a QR detector
    qr_detector = cv2.QRCodeDetector()
    retval, points = qr_detector.detect(gray)
    
    # If QR code is detected
    if retval:
        print("QR Code detected!")
        # Get bounding rect
        rect = cv2.boundingRect(points)
        x, y, w, h = rect
        
        # Extract QR code region
        qr_img = img[y:y+h, x:x+w]
        
        # For album cover, assume it's the largest remaining contour
        # Create a mask that removes the QR code region
        mask = np.ones(gray.shape[:2], dtype=np.uint8) * 255
        mask[y:y+h, x:x+w] = 0
        
        # Find contours in the masked image
        masked_gray = cv2.bitwise_and(gray, gray, mask=mask)
        _, thresh = cv2.threshold(masked_gray, 150, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Find the largest contour (assumed to be the album cover)
            largest_contour = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest_contour)
            album_img = img[y:y+h, x:x+w]
            
            # Save both regions to temporary files
            qr_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
            album_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
            
            cv2.imwrite(qr_file.name, qr_img)
            cv2.imwrite(album_file.name, album_img)
            
            return album_file.name, qr_file.name
    
    # If detection fails, use the whole image
    print("QR code detection failed or not applicable. Using the whole image.")
    return png_file_path, None


def automate_illustrator(ai_file_path, png_file_path):
    """
    Automate Adobe Illustrator to:
    1. Open the AI file
    2. Detect album cover and QR code in the PNG file
    3. Place these elements on the AI file
    4. Add green boxes behind each element
    5. Save the result
    """
    # Get absolute paths
    ai_file_path = os.path.abspath(ai_file_path)
    png_file_path = os.path.abspath(png_file_path)
    
    # Detect album cover and QR code
    album_file, qr_file = detect_qr_and_album(png_file_path)
    
    # Convert paths to format AppleScript understands
    ai_file_path_apple = f'POSIX file "{ai_file_path}"'
    album_file_apple = f'POSIX file "{album_file}"'
    
    # Open the AI file in Illustrator
    print(f"Opening AI file: {ai_file_path}")
    open_script = f'''
    tell application "Adobe Illustrator"
        activate
        open {ai_file_path_apple}
        delay 2
    end tell
    '''
    run_applescript(open_script)
    
    # Place the album cover
    print(f"Placing album cover: {album_file}")
    place_album_script = f'''
    tell application "Adobe Illustrator"
        tell front document
            -- Create a new layer for album cover
            make new layer with properties {{name:"Album Cover", position:1}}
            
            -- Place the album cover image
            tell layer "Album Cover"
                place {album_file_apple}
                delay 1
                -- Get the placed item for reference
                set albumItem to last placed item
                -- Position the album appropriately (adjust coordinates as needed)
                set position of albumItem to {{100, 100}}
            end tell
        end tell
    end tell
    '''
    run_applescript(place_album_script)
    
    # Add green box behind album cover
    print("Creating green box behind album cover")
    create_album_box_script = '''
    tell application "Adobe Illustrator"
        tell front document
            -- Get information about the placed album
            tell layer "Album Cover"
                set albumItem to last placed item
                set albumPos to position of albumItem
                set albumWidth to width of albumItem
                set albumHeight to height of albumItem
                
                -- Create a new layer for the green box behind album
                make new layer with properties {name:"Album Green Background", position:2}
            end tell
            
            -- Create a green rectangle for album
            set greenColor to {0, 128, 0} -- RGB green color
            tell layer "Album Green Background"
                set albumRect to make new rectangle with properties {position:albumPos, width:albumWidth, height:albumHeight}
                set fill color of albumRect to greenColor
            end tell
            
            -- Move album to front
            tell layer "Album Cover"
                arrange last placed item to front
            end tell
        end tell
    end tell
    '''
    run_applescript(create_album_box_script)
    
    # If QR code was detected, place it as well
    if qr_file:
        qr_file_apple = f'POSIX file "{qr_file}"'
        print(f"Placing QR code: {qr_file}")
        place_qr_script = f'''
        tell application "Adobe Illustrator"
            tell front document
                -- Create a new layer for QR code
                make new layer with properties {{name:"QR Code", position:1}}
                
                -- Place the QR code image
                tell layer "QR Code"
                    place {qr_file_apple}
                    delay 1
                    -- Get the placed item for reference
                    set qrItem to last placed item
                    -- Position the QR code (to the right of album cover)
                    tell layer "Album Cover"
                        set albumItem to last placed item
                        set albumPos to position of albumItem
                        set albumWidth to width of albumItem
                    end tell
                    set position of qrItem to {{(item 1 of albumPos) + albumWidth + 50, item 2 of albumPos}}
                end tell
            end tell
        end tell
        '''
        run_applescript(place_qr_script)
        
        # Add green box behind QR code
        print("Creating green box behind QR code")
        create_qr_box_script = '''
        tell application "Adobe Illustrator"
            tell front document
                -- Get information about the placed QR code
                tell layer "QR Code"
                    set qrItem to last placed item
                    set qrPos to position of qrItem
                    set qrWidth to width of qrItem
                    set qrHeight to height of qrItem
                    
                    -- Create a new layer for the green box behind QR
                    make new layer with properties {name:"QR Green Background", position:2}
                end tell
                
                -- Create a green rectangle for QR
                set greenColor to {0, 128, 0} -- RGB green color
                tell layer "QR Green Background"
                    set qrRect to make new rectangle with properties {position:qrPos, width:qrWidth, height:qrHeight}
                    set fill color of qrRect to greenColor
                end tell
                
                -- Move QR to front
                tell layer "QR Code"
                    arrange last placed item to front
                end tell
            end tell
        end tell
        '''
        run_applescript(create_qr_box_script)
    
    # Save the modified file
    output_path = os.path.splitext(ai_file_path)[0] + "_modified.ai"
    output_path_apple = f'POSIX file "{output_path}"'
    print(f"Saving modified file to: {output_path}")
    save_script = f'''
    tell application "Adobe Illustrator"
        tell front document
            save in {output_path_apple}
        end tell
    end tell
    '''
    run_applescript(save_script)
    
    # Clean up temporary files
    if album_file != png_file_path and os.path.exists(album_file):
        os.unlink(album_file)
    if qr_file and os.path.exists(qr_file):
        os.unlink(qr_file)
    
    print("Process completed successfully!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Automate Adobe Illustrator to place PNG elements on AI file with green backgrounds")
    parser.add_argument("ai_file", help="Path to the AI file")
    parser.add_argument("png_file", help="Path to the PNG file containing album cover and QR code")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.ai_file):
        print(f"Error: AI file '{args.ai_file}' not found")
        sys.exit(1)
    
    if not os.path.exists(args.png_file):
        print(f"Error: PNG file '{args.png_file}' not found")
        sys.exit(1)
    
    automate_illustrator(args.ai_file, args.png_file) 