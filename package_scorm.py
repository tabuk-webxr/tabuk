#!/usr/bin/env python3
"""
SCORM 1.2 Packaging Script for Tabuk Pharmaceuticals WebXR Induction
Creates a compliant SCORM 1.2 zip bundle ready for deployment to any LMS.
"""

import os
import zipfile
import sys
import xml.etree.ElementTree as ET

def validate_manifest(manifest_path):
    print(f"Validating manifest: {manifest_path}...")
    if not os.path.exists(manifest_path):
        print("Error: imsmanifest.xml not found!")
        return False
    try:
        tree = ET.parse(manifest_path)
        root = tree.getroot()
        print(f"Manifest root tag: {root.tag} (valid XML)")
        return True
    except Exception as e:
        print(f"Manifest XML parsing error: {e}")
        return False

def build_scorm_package(output_zip="Tabuk_Pharma_WebXR_Induction_SCORM1.2.zip"):
    print("Building SCORM 1.2 Package...")

    if not validate_manifest("imsmanifest.xml"):
        sys.exit(1)

    # Directories and files to include
    include_paths = [
        "imsmanifest.xml",
        "index.html",
        "css",
        "js",
        "assets"
    ]

    total_files = 0
    total_uncompressed_bytes = 0

    with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in include_paths:
            if os.path.isfile(p):
                zf.write(p, arcname=p)
                total_files += 1
                total_uncompressed_bytes += os.path.getsize(p)
                print(f"  + Added file: {p}")
            elif os.path.isdir(p):
                for root, dirs, files in os.walk(p):
                    for file in files:
                        if file.startswith("."):
                            continue
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, ".")
                        zf.write(full_path, arcname=rel_path)
                        total_files += 1
                        total_uncompressed_bytes += os.path.getsize(full_path)
                        print(f"  + Added: {rel_path}")

    zip_size_mb = os.path.getsize(output_zip) / (1024 * 1024)
    print("\n" + "="*55)
    print(f"SCORM 1.2 Package created successfully!")
    print(f"Archive filename : {output_zip}")
    print(f"Total files      : {total_files}")
    print(f"Uncompressed size: {total_uncompressed_bytes / (1024*1024):.2f} MB")
    print(f"ZIP package size : {zip_size_mb:.2f} MB")
    print("="*55 + "\n")

if __name__ == "__main__":
    build_scorm_package()
