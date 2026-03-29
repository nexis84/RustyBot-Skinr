# RustyBot SKINR Gallery

A web application for EVE Online players to upload, share, and browse custom ship skins. Features EVE SSO authentication, multiple image uploads per skin, user profiles, and a searchable gallery.

## Features

- **EVE SSO Authentication** - Login with your EVE Online character
- **Upload Skins** - Add multiple images to showcase your custom ship skins
- **Set Main Image** - Choose which image appears as the primary thumbnail
- **User Profiles** - View all skins by a specific pilot
- **Search** - Find pilots by character name
- **Share Profiles** - Copy shareable links to your profile
- **Persistent Storage** - PostgreSQL database for production (JSON file for local dev)

## Local Development

### Prerequisites

- Node.js (v18+)
- PostgreSQL (optional - falls back to JSON file if not available)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/nexis84/RustyBot-Skinr.git
   cd RustyBot-Skinr
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your credentials:
   - **Cloudinary** - For image storage (get from cloudinary.com)
   - **EVE SSO** - For authentication (get from developers.eveonline.com)

4. **Run locally**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:3000`

## Deployment to Render

### Step 1: Create a PostgreSQL Database

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy the connection string (starts with `postgresql://`)

### Step 2: Deploy on Render

1. **Connect GitHub Repo**
   - Go to [render.com](https://render.com)
   - Click **"New +"** → **"Web Service"**
   - Connect your GitHub account and select `RustyBot-Skinr`

2. **Configure Build Settings**
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`

3. **Add Environment Variables**
   
   | Variable | Value | Get From |
   |----------|-------|----------|
   | `DATABASE_URL` | `postgresql://...` | Neon dashboard |
   | `CLOUDINARY_CLOUD_NAME` | `your_cloud_name` | Cloudinary |
   | `CLOUDINARY_API_KEY` | `your_api_key` | Cloudinary |
   | `CLOUDINARY_API_SECRET` | `your_api_secret` | Cloudinary |
   | `EVE_CLIENT_ID` | `your_client_id` | EVE Developers |
   | `EVE_CLIENT_SECRET` | `your_client_secret` | EVE Developers |
   | `APP_URL` | `https://your-app.onrender.com` | Your Render URL |
   | `NODE_ENV` | `production` | - |

4. **Configure EVE SSO Callback**
   - In EVE Developers portal, set callback URL to:
     `https://your-app.onrender.com/auth/eve/callback`

5. **Deploy**
   - Click **"Create Web Service"**
   - Wait for the build to complete

### Step 3: Verify Deployment

1. Visit your Render URL
2. Test login with EVE SSO
3. Upload a test skin
4. Check that data persists (skins remain after redeploy)

## Environment Variables Reference

### Required for Production

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon, Supabase, etc.) |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `EVE_CLIENT_ID` | EVE Online SSO client ID |
| `EVE_CLIENT_SECRET` | EVE Online SSO client secret |
| `APP_URL` | Your app's public URL |
| `NODE_ENV` | Set to `production` |

### Optional for Local Dev

If `DATABASE_URL` is not set, the app falls back to JSON file storage (`skins-data.json`).

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Framer Motion
- **Backend:** Express.js, Node.js, TypeScript
- **Database:** PostgreSQL (production) / JSON file (local)
- **Image Storage:** Cloudinary
- **Authentication:** EVE Online SSO (OAuth2)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/skins` | GET | Get all skins |
| `/api/skins` | POST | Upload new skin |
| `/api/skins/:id` | DELETE | Delete skin (owner only) |
| `/api/skins/:id/images` | POST | Add image to existing skin |
| `/api/skins/:id/set-main-image` | POST | Set image as main thumbnail |
| `/api/skins/character/:id` | GET | Get skins by character ID |
| `/api/users/search?q=...` | GET | Search users by name |
| `/api/auth/me` | GET | Get current session |
| `/api/auth/eve/url` | GET | Get EVE SSO URL |
| `/auth/eve/callback` | GET | EVE SSO callback |

## License

MIT License - feel free to use and modify.

## Credits

- Built by [RustyBot](https://www.rustybot.co.uk/)
- EVE Online assets property of CCP Games
