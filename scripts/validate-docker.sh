#!/bin/bash

# Script to validate Docker setup for binb

set -e

echo "🔍 Validating Docker setup for binb..."

# Check if required files exist
echo "📁 Checking required files..."

required_files=(
    "Dockerfile"
    "docker-compose.yml"
    "scripts/healthcheck.sh"
    "scripts/docker-entrypoint.sh"
    "scripts/setup-admin.js"
    ".dockerignore"
)

missing_files=0

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - MISSING"
        missing_files=$((missing_files + 1))
    fi
done

if [ $missing_files -gt 0 ]; then
    echo "❌ $missing_files required files are missing!"
    exit 1
fi

# Check if scripts are executable
echo ""
echo "🔧 Checking script permissions..."

scripts=(
    "scripts/healthcheck.sh"
    "scripts/docker-entrypoint.sh"
    "scripts/setup-admin.js"
    "scripts/test-setup.js"
)

for script in "${scripts[@]}"; do
    if [ -x "$script" ]; then
        echo "✅ $script (executable)"
    else
        echo "⚠️  $script (not executable, will be fixed by Dockerfile)"
    fi
done

# Validate Dockerfile syntax
echo ""
echo "🐳 Validating Dockerfile..."

if command -v docker &> /dev/null; then
    # Basic syntax check by parsing the Dockerfile
    if docker build --help > /dev/null 2>&1; then
        echo "✅ Docker is available for building"
        # Additional basic syntax checks
        if grep -q "^FROM" Dockerfile && grep -q "^CMD" Dockerfile; then
            echo "✅ Dockerfile has required FROM and CMD instructions"
        else
            echo "❌ Dockerfile missing required instructions"
            exit 1
        fi
    else
        echo "❌ Docker build command not available"
        exit 1
    fi
else
    echo "⚠️  Docker not installed, skipping Dockerfile validation"
fi

# Validate docker-compose.yml syntax
echo ""
echo "🐙 Validating docker-compose.yml..."

if command -v docker-compose &> /dev/null; then
    if docker-compose config > /dev/null 2>&1; then
        echo "✅ docker-compose.yml syntax is valid"
    else
        echo "❌ docker-compose.yml has syntax errors"
        exit 1
    fi
else
    echo "⚠️  docker-compose not installed, skipping validation"
fi

# Check script content
echo ""
echo "📜 Validating script content..."

# Check healthcheck script
if grep -q "curl.*8138" scripts/healthcheck.sh; then
    echo "✅ healthcheck.sh contains correct health check"
else
    echo "❌ healthcheck.sh missing correct health check"
    exit 1
fi

# Check entrypoint script
if grep -q "npm start" scripts/docker-entrypoint.sh; then
    echo "✅ docker-entrypoint.sh contains startup command"
else
    echo "❌ docker-entrypoint.sh missing startup command"
    exit 1
fi

# Check for proper shebang
for script in scripts/healthcheck.sh scripts/docker-entrypoint.sh; do
    if head -n 1 "$script" | grep -q "#!/bin/bash"; then
        echo "✅ $script has correct shebang"
    else
        echo "❌ $script missing #!/bin/bash shebang"
        exit 1
    fi
done

echo ""
echo "🎉 Docker setup validation completed successfully!"
echo ""
echo "📋 Next steps:"
echo "  1. Build image: docker build -t binb:latest ."
echo "  2. Start services: docker-compose up -d"
echo "  3. Test setup: docker exec -it binb-app node scripts/test-setup.js"
echo "  4. Access app: http://localhost:8138"