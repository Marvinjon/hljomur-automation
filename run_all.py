import subprocess
import os
import time


# Runs the plaque script first, then the 3 Frame / 4 Frame script.
# Dismiss the first completion dialog. The second script starts after that.
jsx_script_path = os.path.abspath("run_all_scripts.jsx")
print(f"Launching Illustrator with script: {jsx_script_path}")
print("1. Plaque files in to_be_processed")
print("2. 3 Frame and 4 Frame pairs in to_be_processed")

# The simplest approach is to use 'open' command to open the script with Illustrator
try:
    # First, ensure Illustrator is open
    illustrator_app = "/Applications/Adobe Illustrator 2025/Adobe Illustrator.app"
    subprocess.run(["open", "-a", illustrator_app], check=True)
    
    # Give Illustrator time to open
    print("Waiting for Illustrator to open...")
    time.sleep(3)
    
    # Then open the script file - it should open in Illustrator
    subprocess.run(["open", "-a", illustrator_app, jsx_script_path], check=True)
    
except Exception as e:
    print(f"Error launching Illustrator: {e}")
    print("You can try to manually open Illustrator and run the script from File > Scripts > Other Script...") 