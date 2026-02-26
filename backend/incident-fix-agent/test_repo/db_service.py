"""
SUMMARY:
This file handles low-level database operations.
It simulates saving data to a database.
⚠️ Contains a bug: it does not handle None values properly.
"""

# This function simulates saving user data into database
def save_to_db(user):
    # BUG: If user is None, this will crash
    if user["name"] == "":
        raise Exception("User name cannot be empty")

    return "User saved successfully"