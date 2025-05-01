#!/usr/bin/env python3
import os
import sys
import subprocess
import platform
import importlib

def check_package(package_name, min_version=None):
    """Check if a Python package is installed and its version."""
    try:
        module = importlib.import_module(package_name)
        if package_name == "cv2":
            version = module.__version__
        elif package_name == "PIL":
            version = module.PILLOW_VERSION if hasattr(module, 'PILLOW_VERSION') else module.__version__
        else:
            version = module.__version__ if hasattr(module, '__version__') else "Unknown"
        
        print(f"✅ {package_name} is installed (version: {version})")
        
        if min_version and version != "Unknown":
            if version.split('.')[:3] < min_version.split('.')[:3]:
                print(f"⚠️  Warning: {package_name} version {version} is older than recommended version {min_version}")
        
        return True
    except ImportError:
        print(f"❌ {package_name} is not installed")
        return False

def check_applescript():
    """Check if AppleScript is available."""
    if platform.system() != "Darwin":
        print("❌ AppleScript is only available on macOS")
        return False
    
    try:
        result = subprocess.run(
            ["osascript", "-e", "return \"AppleScript is working\""],
            capture_output=True, text=True, check=True
        )
        if "AppleScript is working" in result.stdout:
            print("✅ AppleScript is available")
            return True
        else:
            print("❌ AppleScript test returned unexpected result")
            return False
    except subprocess.SubprocessError as e:
        print(f"❌ Error testing AppleScript: {e}")
        return False

def check_illustrator():
    """Check if Adobe Illustrator is installed."""
    if platform.system() != "Darwin":
        print("❌ This script only checks for Illustrator on macOS")
        return False
    
    # Check common Illustrator application paths on macOS
    app_paths = [
        "/Applications/Adobe Illustrator.app",
        "/Applications/Adobe Illustrator CC.app",
        "/Applications/Adobe Illustrator 2021.app",
        "/Applications/Adobe Illustrator 2022.app",
        "/Applications/Adobe Illustrator 2023.app",
    ]
    
    for path in app_paths:
        if os.path.exists(path):
            print(f"✅ Adobe Illustrator found at {path}")
            return True
    
    # If not found in common paths, try using AppleScript to check
    try:
        result = subprocess.run(
            ["osascript", "-e", "tell application \"System Events\" to (name of processes) contains \"Adobe Illustrator\""],
            capture_output=True, text=True, check=True
        )
        if "true" in result.stdout.lower():
            print("✅ Adobe Illustrator is installed (location unknown)")
            return True
        else:
            print("❌ Adobe Illustrator not found")
            return False
    except subprocess.SubprocessError as e:
        print(f"❌ Error checking for Illustrator: {e}")
        return False

def main():
    """Run all the environment checks."""
    print("=" * 50)
    print("Illustrator Automation Environment Check")
    print("=" * 50)
    
    # Check OS
    system = platform.system()
    print(f"Operating System: {system} {platform.version()}")
    if system != "Darwin":
        print("⚠️  Warning: These scripts are designed for macOS")
    
    print("\nChecking required Python packages:")
    packages_ok = all([
        check_package("PIL", "9.0.0"),
        check_package("cv2", "4.5.0"),
        check_package("numpy", "1.19.0")
    ])
    
    print("\nChecking system requirements:")
    applescript_ok = check_applescript()
    illustrator_ok = check_illustrator()
    
    print("\nResults:")
    if packages_ok:
        print("✅ All required Python packages are installed")
    else:
        print("❌ Some required Python packages are missing")
        print("   Please install them with: pip install pillow opencv-python numpy")
    
    if applescript_ok:
        print("✅ AppleScript is available")
    else:
        print("❌ AppleScript is not available or not working")
        print("   This is required for controlling Adobe Illustrator")
    
    if illustrator_ok:
        print("✅ Adobe Illustrator is installed")
    else:
        print("❌ Adobe Illustrator was not found")
        print("   Please make sure Adobe Illustrator is installed")
    
    print("\nOverall status:")
    if packages_ok and applescript_ok and illustrator_ok:
        print("✅ Environment is ready for Illustrator automation!")
    else:
        print("❌ Some requirements are missing. Please fix the issues above.")
    
    print("=" * 50)
    
    return 0 if (packages_ok and applescript_ok and illustrator_ok) else 1

if __name__ == "__main__":
    sys.exit(main()) 