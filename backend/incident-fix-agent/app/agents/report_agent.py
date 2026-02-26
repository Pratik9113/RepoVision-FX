"""
SUMMARY:
Creates final structured report after fix.
"""

def generate_report(root_cause, patch_status):
    return {
        "root_cause": root_cause,
        "patch_status": patch_status,
        "confidence": "Medium"
    }