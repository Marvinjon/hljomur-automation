#!/usr/bin/env python3
import os
import subprocess
import sys
import argparse


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


def automate_illustrator(ai_file_path, png_file_path):
    """
    Automate Adobe Illustrator to:
    1. Open the AI file
    2. Place the PNG file on top
    3. Add a green box layer behind the PNG contents
    4. Save the result
    """
    # Get absolute paths
    ai_file_path = os.path.abspath(ai_file_path)
    png_file_path = os.path.abspath(png_file_path)
    
    # Convert paths to format AppleScript understands (POSIX to Apple format)
    ai_file_path_apple = f'POSIX file "{ai_file_path}"'
    png_file_path_apple = f'POSIX file "{png_file_path}"'
    
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
    
    # Place the PNG file on top
    print(f"Placing PNG file: {png_file_path}")
    place_script = f'''
    tell application "Adobe Illustrator"
        tell front document
            -- Place the PNG file
            place {png_file_path_apple}
            delay 1
        end tell
    end tell
    '''
    run_applescript(place_script)
    
    # Create a new layer with a green box behind the placed PNG
    print("Creating green box behind PNG elements")
    create_green_box_script = '''
    tell application "Adobe Illustrator"
        tell front document
            -- Get information about the placed PNG
            set placedItem to last placed item
            set placePos to position of placedItem
            set placeWidth to width of placedItem
            set placeHeight to height of placedItem
            
            -- Create a new layer behind the current one for the green box
            make new layer with properties {name:"Green Background", position:2}
            
            -- Create a green rectangle
            set greenColor to {0, 128, 0} -- RGB green color
            tell layer "Green Background"
                set greenRect to make new rectangle with properties {position:placePos, width:placeWidth, height:placeHeight}
                set fill color of greenRect to greenColor
            end tell
            
            -- Move placed item to front
            tell layer 1
                arrange placedItem to front
            end tell
        end tell
    end tell
    '''
    run_applescript(create_green_box_script)
    
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
    
    print("Process completed successfully!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Automate Adobe Illustrator to place PNG on AI file with green background")
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