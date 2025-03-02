#!/bin/bash

# Finde alle TypeScript-Dateien im API-Verzeichnis
find src/app/api -name "*.ts" -type f -exec sed -i '' 's|from '\''@/app/api/auth/\[...nextauth\]/route'\''|from '\''@/lib/auth'\''|g' {} + 