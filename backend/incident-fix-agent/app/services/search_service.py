"""
SUMMARY:
Searches repository files based on keywords.
Returns top matching files.
"""

import os

def search_files(keywords):
    matches = []

    for root, _, files in os.walk("../test_repo"):
        for file in files:
            if file.endswith(".py"):
                for keyword in keywords:
                    if keyword in file.lower():
                        matches.append(file)

    return matches