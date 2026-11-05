import os
import subprocess
import time


def find_illustrator():
    fallback = "/Applications/Adobe Illustrator 2025/Adobe Illustrator.app"
    apps_dir = "/Applications"
    found = []

    try:
        for name in os.listdir(apps_dir):
            if name.startswith("Adobe Illustrator") and name.endswith(".app"):
                found.append(os.path.join(apps_dir, name))
    except OSError:
        return fallback

    if not found:
        return fallback

    found.sort(reverse=True)
    return found[0]


jsx_script_path = os.path.abspath("minningarplatti_script.jsx")
input_folder = os.path.abspath("minningarplatti_to_be_processed")
os.makedirs(input_folder, exist_ok=True)

print(f"Launching Illustrator with script: {jsx_script_path}")
print(f"Place 3 Frame and 4 Frame pairs in: {input_folder}")

illustrator_app = find_illustrator()

try:
    subprocess.run(["open", "-a", illustrator_app], check=True)

    print("Waiting for Illustrator to open...")
    time.sleep(3)

    subprocess.run(["open", "-a", illustrator_app, jsx_script_path], check=True)
except Exception as e:
    print(f"Error launching Illustrator: {e}")
    print("You can try to manually open Illustrator and run the script from File > Scripts > Other Script...")
