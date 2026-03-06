# HMO ERP - Health Management Operations Platform

## Overview
Enterprise-grade Health Maintenance Organization management system with AI-powered document processing, claims management, and pre-authorization workflows.

## System Requirements
- PHP 8.1 or higher
- MySQL 5.7 or higher
- Node.js 18+ (for development only)
- Composer
- 1GB disk space minimum

## Quick Installation

### 1. Server Setup (cPanel)
- Create a subdomain (e.g., `hmo.yourdomain.com`)
- Create a MySQL database and user
- Set PHP version to 8.2 in MultiPHP Manager

### 2. Upload Files
- Upload `hmo_erp_v1.0.zip` to your server
- Extract to your subdomain folder
- Move contents of `hmo_app/public/` to your web root

### 3. Configure
- Copy `hmo_app/.env.example` to `hmo_app/.env`
- Edit database credentials and `APP_URL`
- Add your Anthropic API key

### 4. Install
```bash
cd /path/to/hmo_app
bash ../install.sh