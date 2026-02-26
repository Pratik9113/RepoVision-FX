"""
SUMMARY:
This file simulates the main application logic.
It calls user repository to save a user.
Acts as entry point for business logic.
"""

from user_repo import save_user


def create_user():
    # Simulating user input
    user = {
        "name": ""
    }

    return save_user(user)


if __name__ == "__main__":
    print(create_user())