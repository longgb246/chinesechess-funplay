#!/bin/bash

# Christmas Tree Project Upload Script
# This script packages the project and uploads it to a remote server via SCP

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

CONFIG_FILE="upload.config.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: Configuration file '$CONFIG_FILE' not found!${NC}"
    echo -e "${YELLOW}Please copy 'upload.config.example.json' to '$CONFIG_FILE' and configure it.${NC}"
    exit 1
fi

# Parse JSON without jq (using grep and sed)
SERVER_HOST=$(grep -o '"host"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | sed 's/.*"\([^"]*\)".*/\1/')
SERVER_USER=$(grep -o '"user"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | sed 's/.*"\([^"]*\)".*/\1/')
SERVER_PORT=$(grep -o '"port"[[:space:]]*:[[:space:]]*[0-9]*' "$CONFIG_FILE" | sed 's/.*:[[:space:]]*\([0-9]*\).*/\1/')
REMOTE_PATH=$(grep -o '"remotePath"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | sed 's/.*"\([^"]*\)".*/\1/')
ARCHIVE_NAME=$(grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | sed 's/.*"\([^"]*\)".*/\1/')

if [ "$SERVER_HOST" = "your-server.com" ] || [ "$SERVER_HOST" = "null" ]; then
    echo -e "${RED}Error: Please configure server host in '$CONFIG_FILE'${NC}"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Project Upload Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Server: ${GREEN}$SERVER_USER@$SERVER_HOST:$SERVER_PORT${NC}"
echo -e "  Remote Path: ${GREEN}$REMOTE_PATH${NC}"
echo -e "  Archive: ${GREEN}$ARCHIVE_NAME${NC}"
echo ""

# Clean old archive
if [ -f "$ARCHIVE_NAME" ]; then
    echo -e "${YELLOW}Removing old archive...${NC}"
    rm -f "$ARCHIVE_NAME"
    echo -e "${GREEN}✓ Old archive removed${NC}"
    echo ""
fi

# Create archive (excluding files in .gitignore)
echo -e "${YELLOW}Creating archive...${NC}"
echo -e "  Excluding files from .gitignore"
echo -e "  Excluding macOS metadata files (._*)"
echo -e "  Excluding macOS extended attributes"

# Use tar with --exclude-from to respect .gitignore
# COPYFILE_DISABLE=1 prevents macOS from including ._ files
# --no-xattrs prevents including extended attributes (avoids LIBARCHIVE.xattr warnings)
COPYFILE_DISABLE=1 tar --exclude-from=.gitignore \
    --exclude=".git" \
    --exclude="$ARCHIVE_NAME" \
    --exclude="._*" \
    --exclude=".DS_Store" \
    --no-xattrs \
    -czf "$ARCHIVE_NAME" .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Archive created: $ARCHIVE_NAME ($(du -h "$ARCHIVE_NAME" | cut -f1))${NC}"
else
    echo -e "${RED}✗ Archive creation failed${NC}"
    exit 1
fi
echo ""

# Upload to server
echo -e "${YELLOW}Uploading to server...${NC}"
ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" "mkdir -p $REMOTE_PATH"
scp -P "$SERVER_PORT" "$ARCHIVE_NAME" "$SERVER_USER@$SERVER_HOST:$REMOTE_PATH/"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Upload successful${NC}"
else
    echo -e "${RED}✗ Upload failed${NC}"
    exit 1
fi
echo ""

# Ask if want to extract on server
echo -e "${YELLOW}Extract on server? (y/n)${NC}"
read -r EXTRACT_CHOICE

if [ "$EXTRACT_CHOICE" = "y" ] || [ "$EXTRACT_CHOICE" = "Y" ]; then
    echo -e "${YELLOW}Extracting files on server...${NC}"
    ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" << EOF
        cd ${REMOTE_PATH}
        tar -xzf ${ARCHIVE_NAME}
        rm ${ARCHIVE_NAME}
        echo "Extraction completed"
EOF
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Server extraction successful${NC}"
    else
        echo -e "${RED}✗ Server extraction failed${NC}"
        exit 1
    fi
fi
echo ""

# Ask if want to delete local archive
echo -e "${YELLOW}Delete local archive? (y/n)${NC}"
read -r CLEAN_CHOICE

if [ "$CLEAN_CHOICE" = "y" ] || [ "$CLEAN_CHOICE" = "Y" ]; then
    rm "$ARCHIVE_NAME"
    echo -e "${GREEN}✓ Local archive deleted${NC}"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Upload Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}Files uploaded to: ${SERVER_USER}@${SERVER_HOST}:${REMOTE_PATH}${NC}"
