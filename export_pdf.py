import os
import subprocess
import time


jsx_script_path = os.path.abspath("export_pdf.jsx")
print(f"Launching Illustrator with script: {jsx_script_path}")
print("Reads AI files from complete and writes PDFs to pdf")

illustrator_app = "/Applications/Adobe Illustrator 2025/Adobe Illustrator.app"

try:
    subprocess.run(["open", "-a", illustrator_app], check=True)

    print("Waiting for Illustrator to open...")
    time.sleep(3)

    subprocess.run(["open", "-a", illustrator_app, jsx_script_path], check=True)
except Exception as e:
    print(f"Error launching Illustrator: {e}")
    print("You can try to manually open Illustrator and run the script from File > Scripts > Other Script...")
