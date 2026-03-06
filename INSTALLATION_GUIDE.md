# HMO ERP - Complete Installation Guide

## Table of Contents
1. [System Requirements](#requirements)
2. [cPanel Setup](#cpanel-setup)
3. [File Upload](#file-upload)
4. [Configuration](#configuration)
5. [Installation](#installation)
6. [Post-Installation](#post-installation)
7. [Troubleshooting](#troubleshooting)

## 1. System Requirements <a name="requirements"></a>
- PHP 8.1 or higher
- MySQL 5.7 or higher
- cPanel / Shared hosting (or any PHP server)
- 1GB disk space minimum
- SSL certificate (AutoSSL works)

## 2. cPanel Setup <a name="cpanel-setup"></a>

### 2.1 Create Subdomain
1. Log into cPanel
2. Go to **Domains** → **Subdomains**
3. Create: `hmo.yourdomain.com`
4. Document root: `/home/username/public_html/hmo.yourdomain.com`

### 2.2 Create Database
1. Go to **MySQL Databases**
2. Create new database: `username_hmo`
3. Create new user: `username_hmo_user`
4. Add user to database with **ALL PRIVILEGES**
5. Note down database name, username, and password

### 2.3 Set PHP Version
1. Go to **MultiPHP Manager**
2. Select your subdomain
3. Choose PHP 8.2

## 3. File Upload <a name="file-upload"></a>

### 3.1 Upload via File Manager
1. In cPanel, open **File Manager**
2. Navigate to `/home/username/`
3. Upload `hmo_erp_v1.0.zip`
4. Right-click → **Extract**

### 3.2 Move Public Files
1. Go to `/home/username/hmo_app/public/`
2. Select ALL files
3. Copy to `/home/username/public_html/hmo.yourdomain.com/`

## 4. Configuration <a name="configuration"></a>

### 4.1 Configure `.env`
1. Go to `/home/username/hmo_app/`
2. Copy `.env.example` to `.env`
3. Edit `.env`:

```ini
APP_NAME="HMO ERP"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://hmo.yourdomain.com

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=username_hmo
DB_USERNAME=username_hmo_user
DB_PASSWORD=your_password

ANTHROPIC_API_KEY=sk-ant-api03-...