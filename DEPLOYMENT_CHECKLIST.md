# HMO ERP - Internal Deployment Checklist

## Project: __________________________
## Date: ____________________________
## Deployed by: _____________________

## ✅ Pre-Deployment (Local Machine)
- [ ] Run `composer install --no-dev`
- [ ] Run `npm install && npm run build`
- [ ] Test all features locally
- [ ] Create deployment zip excluding dev files
- [ ] Verify `AIService.php` is present
- [ ] Verify `vendor/` directory is included
- [ ] Verify `public/build/` has compiled assets

## ✅ Server Setup (cPanel)
- [ ] Create subdomain: `hmo.[domain].com`
- [ ] Create database: `[username]_hmo_erp`
- [ ] Create database user: `[username]_hmo_user`
- [ ] Grant ALL PRIVILEGES to user
- [ ] Set PHP 8.2 in MultiPHP Manager
- [ ] Enable SSL via AutoSSL

## ✅ Application Upload
- [ ] Upload `hmo_app/` to `/home/[username]/`
- [ ] Copy `public/` contents to `/home/[username]/public_html/hmo.[domain].com/`
- [ ] Update `index.php` with absolute path
- [ ] Create `.htaccess` in web root
- [ ] Create `.env` from `.env.example`
- [ ] Set correct database credentials
- [ ] Set `APP_URL=https://hmo.[domain].com`
- [ ] Add `ANTHROPIC_API_KEY`

## ✅ Database Configuration
- [ ] Database name: ________________
- [ ] Database user: ________________
- [ ] Database password: ____________
- [ ] Test connection: `php artisan tinker -> DB::connection()->getPdo()`

## ✅ Server Commands (SSH or Terminal)
- [ ] `cd /home/[username]/hmo_app`
- [ ] `php artisan key:generate`
- [ ] `php artisan migrate --force`
- [ ] `php artisan db:seed --force`
- [ ] `php artisan storage:link`
- [ ] `php artisan config:cache`
- [ ] `php artisan route:cache`
- [ ] `php artisan view:cache`
- [ ] `chmod -R 775 storage bootstrap/cache`

## ✅ Licensing Server (Separate)
- [ ] Subdomain: `licensing.[domain].com`
- [ ] Database: `[username]_licensing`
- [ ] RSA keys generated and configured
- [ ] Test health: `https://licensing.[domain].com/api/health`

## ✅ Final Testing
- [ ] Visit domain - login page loads
- [ ] Test login with admin credentials
- [ ] Test AI Chat feature
- [ ] Test Document Classification
- [ ] Test OCR upload
- [ ] Test Smart Routing
- [ ] Test Fraud Clusters
- [ ] Create test user
- [ ] Create test branch
- [ ] Create test corporate
- [ ] Create test enrollee
- [ ] Submit test claim
- [ ] Verify license sync with licensing server

## ✅ Client Handoff
- [ ] Provide login credentials
- [ ] Provide API key setup instructions
- [ ] Provide support contact
- [ ] Schedule training (if applicable)

## Notes
_____________________________________________________
_____________________________________________________
_____________________________________________________

## Sign-off
Deployed by: __________________ Date: ______________
Verified by: __________________ Date: ______________