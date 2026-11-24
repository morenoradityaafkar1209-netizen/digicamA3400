DIGICAM ARCHIVE V3 — SHARED ONLINE GALLERY
==========================================

WHAT THIS VERSION DOES
- All visitors see the same online albums and photos.
- Visitors can view and download photos.
- Only an authenticated admin can upload, create albums, move photos, and delete photos.
- "IMPORT V2 PHOTOS" can copy photos from the old V2 localStorage archive in the same browser.

IMPORTANT PRIVACY
The photo bucket is public so visitors can see images. Anyone with the gallery URL may view/download photos.
Only upload photos you have permission to share. Never publish private or sensitive photos.
Never put a Supabase service_role key in this website. Use only the anon/publishable key.

STEP 1 — CREATE SUPABASE PROJECT
1. Open https://supabase.com and create/sign in to an account.
2. Create a new project. Save the database password somewhere private.
3. Wait until the project finishes setting up.

STEP 2 — CREATE DATABASE + PHOTO STORAGE
1. In Supabase, open SQL Editor.
2. Click New query.
3. Open this project's supabase-setup.sql, copy all its contents.
4. Paste into SQL Editor and click Run.
This creates albums/photos tables, access policies, and the public photo bucket.

STEP 3 — CREATE THE ADMIN LOGIN
1. In Supabase, open Authentication > Users.
2. Add user / Create new user.
3. Enter the admin email and a strong password that you keep private.
4. Turn OFF public sign-ups in Authentication settings if the setting is available.
Only create an admin account for yourself. Do not share its password.

STEP 4 — COPY SUPABASE API SETTINGS
1. Open Project Settings > API (or API Keys).
2. Copy the Project URL.
3. Copy the anon/public key (may be labelled publishable key).
4. Open config.js in this project.
5. Replace the two placeholder strings:
   SUPABASE_URL
   SUPABASE_ANON_KEY
6. Save config.js.
NEVER use the secret key or service_role key.

STEP 5 — PUBLISH ON GITHUB PAGES
1. Upload/replace index.html, style.css, script.js, and config.js in your existing digicam-archive repository.
2. Upload supabase-setup.sql too if you want to keep the setup file with your project.
3. Wait for GitHub Pages to deploy, then reload the website.

STEP 6 — TEST
1. Open your public website. It should show an empty shared gallery.
2. Click ADMIN LOGIN.
3. Sign in with the admin email/password created in Supabase.
4. Create an album and upload a test photo.
5. Open the website in another browser/device. The same photo should appear without admin login.
6. Visitors can open and download; admin can manage.

IMPORT PHOTOS FROM V2
- Open the V3 website in the same browser where you used V2 and where its photos are still stored.
- Sign in as admin.
- Click IMPORT V2 PHOTOS.
- Confirm the import. Leave the tab open until it finishes.
- It copies existing V2 albums and photos to Supabase; it does not delete the old local archive.
If the old photos were uploaded from another browser/device, the importer cannot access them there.

LIMITS / NOTES
- Supabase free plan has storage and bandwidth limits that may change; check your dashboard.
- The SQL policies allow write operations to authenticated users. Keep public sign-ups disabled and do not create/share other user accounts.
- The frontend uses public photo URLs; the gallery is intentionally public.
- If an image is over 10 MB or not JPEG/PNG/WebP/GIF, resize/convert it before upload.
