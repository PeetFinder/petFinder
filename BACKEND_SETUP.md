# PetFinder Backend Setup (XAMPP + phpMyAdmin)

## Requirements

- XAMPP (Apache + MySQL + PHP 8+)
- phpMyAdmin

## 1. Copy project to XAMPP

Copy the whole project folder to:

`C:\xampp\htdocs\petfinder`

Open the site using Apache (not Live Server):

`http://localhost/petfinder/landing.html`

> Important: Use **Apache/XAMPP** for the full backend. Live Server (`127.0.0.1:5500`) cannot run PHP.

## 2. Create database and tables

1. Start **Apache** and **MySQL** in XAMPP Control Panel.
2. Open this setup URL:

`http://localhost/petfinder/api/setup.php`

Database name: `petfinder_db`

Tables created by setup:

- `users`
- `lost_pet_reports`

The setup file also creates or updates the default admin account.

## 3. Configure database connection

Edit `api/config.php` if needed:

```php
'db_host' => 'localhost',
'db_name' => 'petfinder_db',
'db_user' => 'root',
'db_pass' => '',
```

## 4. Default admin account

- Email: `eriane_admin@petfinder.com`
- Password: `Kape!26`

## 5. Test API health

`http://localhost/petfinder/api/health.php`

Expected:

```json
{ "success": true, "backend": true }
```

## API Endpoints

- `GET /api/health.php` checks backend status.
- `POST /api/auth/register.php` registers a client.
- `POST /api/auth/login.php` logs in a client.
- `POST /api/auth/admin-login.php` logs in an admin.
- `POST /api/auth/logout.php` logs out the current session.
- `GET /api/auth/me.php` gets the current session user.
- `GET /api/admin/summary.php` loads admin totals for users and reports.
- `GET /api/admin/users.php` loads registered clients for admin.
- `GET /api/admin/reports.php` loads lost pet reports for admin.
- `PATCH /api/admin/reports.php?id=...` updates report status.
- `DELETE /api/admin/reports.php?id=...` deletes a report.
- `GET /api/reports/index.php` loads public reports.
- `POST /api/reports/index.php` creates a report.
- `PUT /api/reports/single.php?id=...` updates a report.
- `DELETE /api/reports/single.php?id=...` deletes a report.

## Admin panel

- Users: `http://localhost/petfinder/admin-users.html`
- Reports: `http://localhost/petfinder/admin-reports.html`

Registered clients are stored in MySQL `users` table (`role = user`).
Admin accounts are excluded from the Registered Users list.

## Troubleshooting

- If API health fails, check that MySQL is running and open `api/setup.php` again.
- If registration is not showing in admin, refresh the admin page and check the `users` table in phpMyAdmin.
- If admin login fails, open `api/setup.php` again to reset the default admin.
- If there are CORS or session issues, use `http://localhost/petfinder/` only. Do not use Live Server for backend testing.
