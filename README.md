# Bespokee Sourcing Services — Landing page

This folder contains a small, responsive static landing page scaffold that recreates and improves the shared Canvas design using the same color palette.

Preview locally:

```bash
# from the repo root
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

Files added:
- `index.html` — main markup
- `styles.css` — styles and palette
- `script.js` — small interactions

## Admin backend and dynamic cards
This project now includes a minimal Vercel API backend and an admin panel for managing card images.

### New files
- `admin.html` — admin login and card management UI
- `admin.js` — client-side admin interactions
- `cards.js` — dynamic product page loader for category pages
- `api/login.js` — login endpoint for admin authentication
- `api/logout.js` — logout endpoint
- `api/cards.js` — card listing, create, and delete API endpoint
- `api/_auth.js` — token cookie helper for admin authentication
- `vercel.json` — route rewrite for `/admin`

### How it works
- `/admin` or `/admin.html` is the admin login page.
- Admin credentials are validated using `ADMIN_PASSWORD` in Vercel environment variables.
- Product pages with `section-label` values load card data from `/api/cards`.
- Admin users can add new card items and upload photos to Supabase storage.

### Required environment variables
Add these values in Vercel:
- `ADMIN_PASSWORD` — the admin login password
- `ADMIN_SECRET` — a secret string used to sign admin session cookies
- `SUPABASE_URL` — your Supabase project URL, e.g. `https://xyzcompany.supabase.co`
- `SUPABASE_SERVICE_KEY` — Supabase service role key
- `SUPABASE_STORAGE_BUCKET` — storage bucket name, default `cards-images`
- `SUPABASE_TABLE` — table name for cards, default `cards`

### Supabase setup
Create a table named `cards` with columns:
- `id` (primary key, bigint or serial)
- `category` (text)
- `title` (text)
- `description` (text)
- `image_url` (text)
- `image_path` (text)
- `sort_order` (integer)

Create a public storage bucket named `cards-images` and allow public access so uploaded images can be displayed directly.

### Preview locally
To preview this setup locally, use Vercel CLI or `vercel dev` after setting the required env vars.

1. Copy the example env file:
```bash
cp .env.local.example .env.local
```
2. Edit `.env.local` and paste your real values.
3. Install dependencies and start local development:
```bash
npm install
npm run dev
```
4. Open `http://localhost:3000/admin` to test admin login.

# Vercel environment variables
If Vercel web UI does not let you add environment variables on your current plan, use the Vercel CLI:

```bash
npm install -g vercel
vercel login
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_KEY production
vercel env add ADMIN_PASSWORD production
vercel env add ADMIN_SECRET production
vercel env add SUPABASE_STORAGE_BUCKET production
vercel env add SUPABASE_TABLE production
```

Repeat for `preview` if you want branch/PR deployment to use the same values.

If you only need local testing, `.env.local` is enough.

## Custom domain (GoDaddy)

Once deployed, add your GoDaddy domain in the Vercel dashboard under Domains. Vercel will show the DNS records to add on GoDaddy:

- an `A` record or `CNAME` for the root domain
- a `CNAME` record for the `www` domain

After updating the domain records in GoDaddy, Vercel will verify them and issue HTTPS automatically.

# Bespokee-Sourcing-Services