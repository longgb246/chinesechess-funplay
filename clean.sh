#!/bin/bash

# Clean Script - 删除当前目录下除了 .git 以外的所有文件和文件夹
# 使用前请确保已经备份重要文件！

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}========================================${NC}"
echo -e "${RED}  警告：此操作将删除所有文件！${NC}"
echo -e "${RED}========================================${NC}"
echo -e "${YELLOW}当前目录：$(pwd)${NC}"
echo -e "${YELLOW}将保留：.git 目录${NC}"
echo ""
echo -e "${RED}此操作不可逆！请确认是否继续？${NC}"
echo -e "${YELLOW}输入 'yes' 继续，其他任何输入将取消操作${NC}"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${GREEN}操作已取消${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}开始清理...${NC}"

# 删除所有文件和文件夹，但保留 .git
find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 清理完成！${NC}"
    echo -e "${YELLOW}剩余文件：${NC}"
    ls -la
else
    echo -e "${RED}✗ 清理失败${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  清理完成！${NC}"
echo -e "${GREEN}========================================${NC}"
