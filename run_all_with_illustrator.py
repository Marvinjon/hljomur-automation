#!/usr/bin/env python3
import subprocess
import os
import shutil
import time

def run_png_processing():
    """Run the PNG to white conversion script"""
    print("Running PNG processing...")
    subprocess.run(["python3", "process_plaques.py"], check=True)

def run_illustrator_script():
    """Run the Illustrator script using a more reliable method"""
    # Get absolute path to JSX script
    script_path = os.path.abspath("layer_merge_script.jsx")
    
    # Check if the script exists
    if not os.path.exists(script_path):
        print(f"Error: Script not found at {script_path}")
        return False
    
    # For Mac, we can use "open" command with the -a flag to specify the application
    illustrator_app = "/Applications/Adobe Illustrator 2025/Adobe Illustrator.app"
    
    # Check if Illustrator exists
    if not os.path.exists(illustrator_app):
        print(f"Error: Illustrator not found at {illustrator_app}")
        return False
    
    # First, try using AppleScript directly 
    try:
        print(f"Launching Illustrator with script: {script_path}")
        
        # Use AppleScript to run the script
        applescript = f'''
        tell application "Adobe Illustrator"
            activate
            open file "{script_path.replace('/', ':')}"
        end tell
        '''
        
        subprocess.run(["osascript", "-e", applescript], check=True)
        print("Successfully launched Illustrator!")
        return True
    except Exception as e:
        print(f"Error with AppleScript approach: {e}")
        print("Trying alternative approach...")
    
    # Alternative approach: create a temporary script that just loads our main script
    try:
        print("Using alternative method to launch Illustrator...")
        
        # Create a temporary directory
        temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_scripts")
        os.makedirs(temp_dir, exist_ok=True)
        
        # Create a launcher script
        launcher_path = os.path.join(temp_dir, "launcher.jsx")
        with open(launcher_path, "w") as f:
            f.write(f'#include "{script_path.replace("\\", "//")}"\n')
        
        # Open the launcher script with Illustrator
        subprocess.run(["open", "-a", illustrator_app, launcher_path], check=True)
        print("Successfully launched Illustrator with the launcher script!")
        return True
    except Exception as e:
        print(f"Error with alternative approach: {e}")
        return False

if __name__ == "__main__":
    # Run the PNG processing
    run_png_processing()
    
    # Run the Illustrator script
    success = run_illustrator_script()
    
    if success:
        print("Process completed! Illustrator should now be open and processing the files.")
        print("Note: You may need to interact with Illustrator dialogs.")
    else:
        print("Failed to launch Illustrator with the script.")
        print("You can try to manually open Illustrator and run the script from File > Scripts > Other Script...") 