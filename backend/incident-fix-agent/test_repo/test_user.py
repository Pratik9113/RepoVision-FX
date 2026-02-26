"""
SUMMARY:
This file contains unit tests.
Currently it does NOT test for None user.
Your agent should add regression tests later.
"""

from user_repo import save_user


def test_valid_user():
    user = {"name": "Pratik"}
    result = save_user(user)
    assert result == "User saved successfully"