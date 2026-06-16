# PetFinder — Connect to MySQL (XAMPP)

> **Domain:** `http://localhost/petfinder/`  
> Do not use Live Server (port 5500) or `127.0.0.1:3308` (that is strictly the MySQL port).

## How to run in VS Code / Cursor

1. Start **Apache** and **MySQL** in XAMPP.
2. Press **F5** or **Ctrl+Shift+B**.
3. The site will open at `http://localhost/petfinder/`.

## Step 1: Copy the project

Copy the entire folder to:

`C:\xampp\htdocs\petfinder`

> If you make edits inside the Downloads folder, run **F5** to auto-sync, or manually copy it again to `htdocs\petfinder`.

## Step 2: Open XAMPP

1. Start **Apache**
2. Start **MySQL** (port **3308**)

## Step 3: Create the database in phpMyAdmin

1. Open: `http://localhost/phpmyadmin`
2. Go to the **SQL** tab → paste **Step 1 and 2** from `database/phpmyadmin_queries.sql`
3. Click **Go**

## Step 4: Create an admin account

`http://localhost/petfinder/api/setup.php`

Admin login:
- Email: `eriane_admin@petfinder.com`
- Password: `Kape!26`

## Step 5: Test the connection

`http://localhost/petfinder/api/health.php`

Expected output: `{"success":true,"backend":true}`

## Step 6: Website URLs (all under localhost)

| Page | URL |
|------|-----|
| Home | `http://localhost/petfinder/` |
| Landing | `http://localhost/petfinder/landing.html` |
| Register / Login | `http://localhost/petfinder/auth.html` |
| Admin Login | `http://localhost/petfinder/admin-auth.html` |
| Admin Users | `http://localhost/petfinder/admin-users.html` |
| Admin Reports | `http://localhost/petfinder/admin-reports.html` |
| phpMyAdmin | `http://localhost/phpmyadmin` |

## Database config (`api/config.php`)

| Setting | Value |
|---------|-------|
| Host | `127.0.0.1` |
| Port | `3308` |
| Database | `petfinder_db` |
| User | `root` |
| Password | *(blank)* |