"""
SUMMARY:
This file acts as a repository layer.
It calls the database service to store user data.
This creates dependency on db_service.py.
"""

# Importing database function
from db_service import save_to_db


# This function saves user by calling DB layer
def save_user(user):
    return save_to_db(user)