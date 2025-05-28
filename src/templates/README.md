# Git Submodules Setup and Configuration Guide

Welcome to the project!
To set up and configure the necessary Git submodules, please follow these steps:

## Setup Steps

1.  **Copy and Configure Environment Variables:**
    First, copy the `.env.example` file to a new file named `.env`:
    ```bash
    cp .env.example .env
    ```
    Next, open the `.env` file and update the submodule URL values (e.g., `SGM_YOUR_SUBMODULE_NAME_URL`) to point to your correct Git repositories. Ensure you use the correct URL (HTTPS or SSH) that you have access to.
    ```plaintext
    # Example content in .env:
    SGM_WALLET_PRIVATE_URL=git@github.com:your-username/untitled-wallet-private.git
    SGM_WALLET_MOBILE_URL=git@github.com:your-username/untitled-wallet-mobile.git
    ```

2.  **Run the Submodule Setup Script:**
    The `setup-submodules.sh` script will read the URLs from your `.env` file (or use the configuration in `.gitmodules` if environment variables are not set for specific submodules) to add, initialize, and update the submodules.

    First, grant execute permission to the script (if it doesn't have it already):
    ```bash
    chmod +x setup-submodules.sh
    ```
    Then, run the script:
    ```bash
    ./setup-submodules.sh
    ```
    This script will perform the necessary operations to clone and set up the submodules.

## Important Notes

*   **Git Access Permissions:** Ensure you have configured access permissions (e.g., SSH keys for GitHub/GitLab, or cached HTTPS credentials) for all submodule repositories listed in `.env` or `.gitmodules`.
*   **Review the Script:** You can view the contents of `setup-submodules.sh` to better understand the commands it executes.

Good luck! 