#!/bin/bash
# HMO ERP — Installation Script
# Run: bash install.sh

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         HMO ERP - One-Click Installation                 ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running in correct directory
if [ ! -f artisan ]; then
    echo -e "${RED}❌ Please run this script from the application root (where artisan is located)${NC}"
    exit 1
fi

# Check PHP version
PHP_VERSION=$(php -v | head -n1 | cut -d' ' -f2 | cut -d'.' -f1-2)
if (( $(echo "$PHP_VERSION < 8.1" | bc -l 2>/dev/null) )); then
    echo -e "${RED}❌ PHP 8.1+ required. Found: $PHP_VERSION${NC}"
    exit 1
fi
echo -e "${GREEN}✅ PHP $PHP_VERSION detected${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Created .env from .env.example${NC}"
        echo -e "${YELLOW}   Please edit .env with your database credentials${NC}"
        echo -e "${YELLOW}   Then run this script again${NC}"
        exit 0
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
fi

# Install/update PHP dependencies
if [ ! -d vendor ]; then
    echo -e "${YELLOW}📦 Installing PHP dependencies...${NC}"
    composer install --no-dev --optimize-autoloader --quiet
    echo -e "${GREEN}✅ Dependencies installed${NC}"
fi

# Generate app key if not set
if grep -q "APP_KEY=$" .env || grep -q "APP_KEY=base64:" .env; then
    echo -e "${YELLOW}🔑 Generating application key...${NC}"
    php artisan key:generate --force --quiet
    echo -e "${GREEN}✅ App key generated${NC}"
fi

# Run migrations
echo -e "${YELLOW}🔄 Running database migrations...${NC}"
php artisan migrate --force --quiet
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migrations completed${NC}"
else
    echo -e "${RED}❌ Migrations failed. Check database credentials in .env${NC}"
    exit 1
fi

# Run seeders
echo -e "${YELLOW}🌱 Seeding database...${NC}"
php artisan db:seed --force --quiet
echo -e "${GREEN}✅ Database seeded${NC}"

# Storage link
echo -e "${YELLOW}🔗 Creating storage link...${NC}"
php artisan storage:link --quiet 2>/dev/null || true
echo -e "${GREEN}✅ Storage linked${NC}"

# Cache configuration
echo -e "${YELLOW}⚡ Caching configuration...${NC}"
php artisan config:cache --quiet
php artisan route:cache --quiet
php artisan view:cache --quiet
echo -e "${GREEN}✅ Cache created${NC}"

# Set permissions
echo -e "${YELLOW}🔒 Setting permissions...${NC}"
chmod -R 775 storage bootstrap/cache
echo -e "${GREEN}✅ Permissions set${NC}"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ INSTALLATION COMPLETE!                                ║${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║  Next steps:                                              ║${NC}"
echo -e "${GREEN}║  1. Visit your domain                                     ║${NC}"
echo -e "${GREEN}║  2. Log in with default admin credentials                 ║${NC}"
echo -e "${GREEN}║  3. Configure system settings                             ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"