#!/bin/bash

# Restoring backend python packages
echo ""
echo "Restoring backend python packages"
echo ""
python3 -m pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "Failed to restore backend python packages"
    exit $?
fi

# Restoring frontend npm packages
echo ""
echo "Restoring frontend npm packages"
echo ""
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "Failed to restore frontend npm packages"
    exit $?
fi

# Building frontend
echo ""
echo "Building frontend"
echo ""
npm run build
if [ $? -ne 0 ]; then
    echo "Failed to build frontend"
    exit $?
fi

# Starting backend
echo ""
echo "Starting backend"
echo ""
cd ..
python3 -m uvicorn app:app --port 50505 --reload
if [ $? -ne 0 ]; then
    echo "Failed to start backend"
    exit $?
fi
