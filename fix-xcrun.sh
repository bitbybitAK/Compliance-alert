#!/bin/bash

echo "🔧 Fixing xcrun error..."
echo ""
echo "Attempting to reinstall Xcode Command Line Tools..."
echo "This will open a system dialog - please click 'Install' when prompted."
echo ""

# Try to install command line tools
xcode-select --install 2>&1

echo ""
echo "If a dialog appeared, please complete the installation."
echo "If you see 'command line tools are already installed', try:"
echo "  sudo xcode-select --reset"
echo ""
echo "After installation completes, verify with: git --version"
