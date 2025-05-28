#!/bin/bash

# Colors for output
GREEN='\\033[0;32m' # Escaped for JS, then for Bash -> [0;32m
RED='\\033[0;31m'
YELLOW='\\033[0;33m'
NC='\\033[0m' # No Color

echo -e "${YELLOW}--- Submodule Setup Script ---${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo -e "${YELLOW}Please copy .env.example to .env, fill in your submodule URLs, then re-run this script.${NC}"
    echo -e "${YELLOW}Alternatively, if you are not using .env for submodule URLs, ensure your .gitmodules file is correctly configured.${NC}"
    exit 1
fi

# Source environment variables
echo -e "${YELLOW}Sourcing environment variables from .env...${NC}"
set -a
source .env
set +a
echo ""

# --- SUBMODULE PROCESSING LOGIC ---
echo -e "${YELLOW}Processing Submodules (Template Mode):${NC}"
echo -e "${YELLOW}This script provides examples for adding submodules using environment variables.${NC}"
echo -e "${YELLOW}If 'create-cursor-workspace' generated this, it would fill in actual submodule details.${NC}"
echo -e "${YELLOW}To use this template manually, uncomment and adapt the example block(s) below.${NC}"
echo ""

# Initialize a flag to track if all required environment variables are set (optional)
# all_env_vars_ok=true

# --- BEGIN EXAMPLE BLOCK FOR ONE SUBMODULE (Uncomment and adapt) ---
# # 1. Define your ENV variable name (from .env) and desired local path for the submodule
# MY_SUBMODULE_ENV_VAR="SGM_EXAMPLE_SUBMODULE_URL" # This key should exist in your .env file
# MY_SUBMODULE_LOCAL_PATH="example-submodule"     # This will be the directory name for the submodule

# # 2. Check if the environment variable is set
# echo -e "${YELLOW}Checking for ${MY_SUBMODULE_ENV_VAR}...${NC}"
# if [ -z "${!MY_SUBMODULE_ENV_VAR}" ]; then # Note: Using indirect expansion ${!VAR_NAME}
#     echo -e "${RED}Error: Environment variable '${MY_SUBMODULE_ENV_VAR}' is not set in .env!${NC}"
#     # all_env_vars_ok=false # Uncomment if using the flag
# else
#     echo -e "${GREEN}Variable '${MY_SUBMODULE_ENV_VAR}' is set to: ${!MY_SUBMODULE_ENV_VAR}${NC}"
#     # 3. Add the submodule using the environment variable
#     # Check if submodule directory already exists and is not empty to prevent 'git submodule add' error
#     if [ -d "${MY_SUBMODULE_LOCAL_PATH}" ] && [ "$(ls -A "${MY_SUBMODULE_LOCAL_PATH}")" ]; then
#         echo -e "${YELLOW}Submodule directory '${MY_SUBMODULE_LOCAL_PATH}' already exists and is not empty. Skipping 'git submodule add'.${NC}"
#         echo -e "${YELLOW}It will be updated by 'git submodule update' later if it's registered in .gitmodules.${NC}"
#     else
#         echo -e "${YELLOW}Attempting to add submodule '${MY_SUBMODULE_LOCAL_PATH}' from URL in ${MY_SUBMODULE_ENV_VAR} (${!MY_SUBMODULE_ENV_VAR})...${NC}"
#         git submodule add -- "${!MY_SUBMODULE_ENV_VAR}" "${MY_SUBMODULE_LOCAL_PATH}"
#         if [ $? -ne 0 ]; then
#             echo -e "${RED}Error adding submodule '${MY_SUBMODULE_LOCAL_PATH}'. Check URL, permissions, or if it's already registered with a different path.${NC}"
#             # all_env_vars_ok=false # Uncomment if using the flag
#         else
#             echo -e "${GREEN}Submodule '${MY_SUBMODULE_LOCAL_PATH}' added successfully or was already registered.${NC}"
#         fi
#     fi
# fi
# echo ""
# --- END EXAMPLE BLOCK FOR ONE SUBMODULE ---

# To add more submodules, copy the entire "BEGIN EXAMPLE BLOCK" to "END EXAMPLE BLOCK",
# and change MY_SUBMODULE_ENV_VAR and MY_SUBMODULE_LOCAL_PATH for each new submodule.

# Optional: Check if all environment variables were okay before proceeding
# if [ "$all_env_vars_ok" = false ]; then
#     echo -e "${RED}One or more critical submodule environment variables were missing. Please review .env and script. Exiting.${NC}"
#     exit 1
# fi
# echo ""


echo -e "${YELLOW}Updating and initializing all registered submodules (this may take a while)...${NC}"
echo -e "${YELLOW}(This clones content for new submodules and updates existing ones based on .gitmodules)${NC}"
git submodule update --init --recursive
if [ $? -ne 0 ]; then
    echo -e "${RED}Error during 'git submodule update'. Please check your Git configuration, .gitmodules, and submodule URLs/permissions.${NC}"
    # Consider adding 'exit 1' here if this step is critical and must succeed.
fi
echo ""

echo -e "${YELLOW}Attempting to checkout 'main' or 'master' branch in all submodules...${NC}"
# This command iterates through each submodule.
# 1. Tries to checkout 'main'. If successful, prints a green message.
# 2. If 'main' fails, tries to checkout 'master'. If successful, prints a green message.
# 3. If both 'main' and 'master' fail, it gets the current branch and prints a yellow warning.
#    This helps identify submodules that might be on a feature branch or detached HEAD.
git submodule foreach --recursive '( \
    git checkout main && echo -e "${GREEN}Checked out main in $name ($path)${NC}" \
) || ( \
    git checkout master && echo -e "${GREEN}Checked out master in $name ($path)${NC}" \
) || ( \
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD) && \
    echo -e "${YELLOW}Warning: Could not checkout main/master in $name ($path). It is currently on branch/commit: $CURRENT_BRANCH. Please check manually if this is not the intended state.${NC}" \
)'
if [ $? -ne 0 ]; then
    echo -e "${RED}Warning: Some issues might have occurred during 'git submodule foreach checkout'. Review output above.${NC}"
fi
echo ""

echo -e "${GREEN}--- Submodule setup script finished ---${NC}"
echo -e "${GREEN}If submodules were added or updated, please review changes and commit '.gitmodules' and the submodule entries/updates to your main project.${NC}"
exit 0 