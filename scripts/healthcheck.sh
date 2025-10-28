#!/bin/bash

# Health check script for binb application
# Checks if the application is responding on port 8138

curl -f http://localhost:8138/ || exit 1