# Installation Guide

Complete step-by-step installation instructions for PaperPilot.

## Table of Contents

1. [Quick Start (5 minutes)](#quick-start)
2. [Detailed Setup](#detailed-setup)
3. [Word Online Installation](#word-online-installation)
4. [Word Desktop Installation](#word-desktop-installation)
5. [Server Setup](#server-setup)
6. [Troubleshooting](#troubleshooting)
7. [Uninstallation](#uninstallation)

---

## Quick Start

### For Users (Pre-built Version)

**Deployed URLs:**
- Client: https://paper-pilot-demo.vercel.app
- Server: https://paperpilot-server.up.railway.app

1. Open [Word Online](https://word.new)
2. Insert → Add-ins → My Add-ins → Upload My Add-in
3. Upload `manifest.xml` (download from releases)
4. Click "PaperPilot" button in Home ribbon

**That's it!** The add-in loads from our deployed servers.

---

### For Developers (Local Setup)

```bash
# 1. Clone repository
git clone https://github.com/YOUR_USERNAME/PaperPilot.git
cd PaperPilot

# 2. Install dependencies
npm install
cd server && npm install && cd ..

# 3. Configure server
echo "OPENAI_API_KEY=sk-your-key-here" > server/.env

# 4. Start development servers
npm run dev-server          # Terminal 1: Client (localhost:3000)
cd server && npm start       # Terminal 2: Server (localhost:3001)

# 5. Load in Word Online
# Insert → Add-ins → Upload My Add-in → Select manifest.xml
# Accept certificate warning at https://localhost:3000/taskpane.html
```

---

## Detailed Setup

### Prerequisites

#### Hardware Requirements

- **Minimum:**
  - 2 GB RAM
  - 500 MB disk space
  - Internet connection (for Word Online)

- **Recommended:**
  - 4 GB RAM
  - Dual monitor (for side-by-side Word + documentation)

#### Software Requirements

**Required:**
- Node.js v18 or later ([Download](https://nodejs.org/))
- npm (comes with Node.js)
- Git ([Download](https://git-scm.com/))
- Modern web browser (Chrome, Edge, Firefox)

**Optional:**
- Microsoft Word Desktop 2016+ (for advanced features)
- Office 365 subscription (for Word Online)

**Check versions:**
```bash
node --version   # Should be v18.x or higher
npm --version    # Should be 8.x or higher
git --version    # Any recent version
```

---

## Word Online Installation

### Step 1: Create Blank Document

1. Go to https://word.new
2. Sign in with Microsoft account
3. New blank document opens automatically

### Step 2: Upload Add-in

1. Click **Insert** tab in ribbon
2. Click **Add-ins** (or **Office Add-ins**)
3. Click **MY ADD-INS** in left sidebar
4. Click **Upload My Add-in** link at bottom

![Upload Add-in](https://via.placeholder.com/600x300?text=Upload+My+Add-in+Screenshot)

### Step 3: Select Manifest

1. Click **Browse...**
2. Navigate to PaperPilot folder
3. Select `manifest.xml`
4. Click **Upload**

### Step 4: Accept Certificate (Development Only)

**First time only:**

1. Click "PaperPilot" button in Home tab
2. You'll see security warning about localhost:3000
3. Click "Continue to website" or similar
4. Add exception in browser settings

**Chrome:**
- Type `chrome://flags/#allow-insecure-localhost`
- Enable flag
- Restart Chrome

**Edge:**
- Settings → Privacy, search, and services
- Scroll to Security
- Enable "Allow localhost loopback"

**Firefox:**
- Click "Advanced" on warning page
- Click "Accept the Risk and Continue"

### Step 5: Verify Installation

1. Look for "PaperPilot" button in Home ribbon
2. Click button
3. Task pane opens on right side
4. Should see logo, language toggle, and four tabs

---

## Word Desktop Installation

### Windows (Office 2016+)

#### Step 1: Enable Developer Tab

1. Open Word
2. File → Options → Customize Ribbon
3. Check "Developer" in right column
4. Click OK

#### Step 2: Sideload Add-in

1. Click **Developer** tab
2. Click **Add-ins**
3. Click **Shared Folder** in left panel
4. Click **Browse...**

**Windows path:**
```
C:\Users\USERNAME\AppData\Local\Microsoft\Office\16.0\Wef
```

5. Copy `manifest.xml` to this folder
6. Restart Word
7. Developer → Add-ins → PaperPilot

#### Alternative: Registry Method

**Windows Registry Editor:**

1. Press Win+R → type `regedit` → Enter
2. Navigate to:
   ```
   HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\WEF\Developer
   ```
3. Create new key (if not exists):
   - Right-click Developer → New → Key
   - Name it (e.g., "PaperPilot")
4. Create String Value:
   - Right-click new key → New → String Value
   - Name: `Manifest`
   - Value: Full path to manifest.xml
   ```
   C:\Users\YOUR_USERNAME\PaperPilot\manifest.xml
   ```
5. Restart Word

---

### macOS (Office 2016+)

#### Step 1: Create Manifest Folder

```bash
mkdir -p ~/Library/Containers/com.microsoft.Word/Data/Documents/wef
```

#### Step 2: Copy Manifest

```bash
cp /path/to/PaperPilot/manifest.xml ~/Library/Containers/com.microsoft.Word/Data/Documents/wef/
```

#### Step 3: Restart Word

1. Quit Word completely (Cmd+Q)
2. Open Word
3. Insert → My Add-ins → PaperPilot

---

### Linux (LibreOffice)

**Note:** Office.js is not officially supported on LibreOffice. Use Word Online instead.

---

## Server Setup

### Development Server

The server is needed for AI features (Term Analysis, Paper Review).

#### Step 1: Install Dependencies

```bash
cd server
npm install
```

#### Step 2: Configure Environment

Create `server/.env`:

```env
# Required
OPENAI_API_KEY=sk-proj-YOUR-KEY-HERE

# Optional
PORT=3001
NODE_ENV=development
```

**Get OpenAI API Key:**
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy and paste into .env file

#### Step 3: Start Server

```bash
npm start
```

**Output:**
```
Server running on http://localhost:3001
Rate limiting: 30 requests/minute per IP
OpenAI API: Connected ✓
```

#### Step 4: Test Server

```bash
curl http://localhost:3001/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-20T12:34:56.789Z"
}
```

---

### Production Deployment

#### Option 1: Railway (Recommended)

1. **Create Railway account:**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create new project:**
   - New Project → Deploy from GitHub repo
   - Select PaperPilot repository
   - Select `server` folder as root

3. **Set environment variables:**
   - Settings → Variables
   - Add `OPENAI_API_KEY`
   - Add `PORT` (Railway auto-assigns)

4. **Deploy:**
   - Railway auto-deploys on git push
   - Note deployment URL (e.g., `paperpilot-server.up.railway.app`)

5. **Update client:**
   - Set `API_SERVER_URL` env var in Vercel
   - Rebuild client

#### Option 2: Heroku

```bash
# Install Heroku CLI
brew install heroku/brew/heroku  # macOS
# or download from heroku.com

# Login
heroku login

# Create app
cd server
heroku create paperpilot-server

# Set config
heroku config:set OPENAI_API_KEY=sk-your-key

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

#### Option 3: DigitalOcean App Platform

1. Create account on DigitalOcean
2. Apps → Create App → GitHub
3. Select repository
4. Set environment variables
5. Deploy

---

## Client Deployment

### Option 1: Vercel (Recommended)

1. **Create Vercel account:**
   - Go to https://vercel.com
   - Sign up with GitHub

2. **Import project:**
   - Add New → Project
   - Import PaperPilot repository
   - Framework Preset: Other
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Set environment variables:**
   - Settings → Environment Variables
   - Add `API_SERVER_URL` = your Railway URL
   - Example: `https://paperpilot-server.up.railway.app`

4. **Deploy:**
   - Vercel auto-deploys on git push to main
   - Production URL: `https://your-project.vercel.app`

5. **Update manifest:**
   - Change all `https://localhost:3000` to your Vercel URL
   - Redeploy if needed

### Option 2: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build
npm run build

# Deploy
netlify deploy --prod --dir=dist

# Set environment variables in Netlify UI
```

### Option 3: GitHub Pages

**Note:** GitHub Pages doesn't support custom environment variables. Use for static testing only.

```bash
# Build with production API URL
API_SERVER_URL=https://your-server.com npm run build

# Deploy to gh-pages branch
npm install -g gh-pages
gh-pages -d dist
```

---

## Troubleshooting

### Issue: "This add-in will not run in your version of Office"

**Cause:** Using Internet Explorer or Edge Legacy webview

**Solutions:**
1. Upgrade to Office 2021 or Microsoft 365
2. Use Word Online instead
3. Update Windows to get modern Edge

**Check Office version:**
- File → Account → About Word
- Look for version number (need 16.0.xxxx or higher)

---

### Issue: Certificate error in development

**Chrome:**
```
chrome://flags/#allow-insecure-localhost
```
Enable and restart.

**Firefox:**
1. Go to https://localhost:3000
2. Click "Advanced"
3. Click "Accept Risk and Continue"

**Edge:**
```
edge://flags/#allow-insecure-localhost
```

---

### Issue: Task pane shows blank white screen

**Possible causes:**
1. JavaScript error (check browser console)
2. API server not running
3. CORS issue

**Debug:**
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests

**Fix:**
```bash
# Restart both servers
# Terminal 1
npm run dev-server

# Terminal 2
cd server && npm start
```

---

### Issue: "Failed to fetch" errors

**Cause:** Server not running or incorrect URL

**Check:**
1. Server is running: `curl http://localhost:3001/health`
2. Proxy configured in `webpack.config.js`:
   ```javascript
   proxy: {
     '/analyze': 'http://localhost:3001'
   }
   ```
3. Environment variable set correctly

---

### Issue: Icons not showing in ribbon

**Cause:** Icon files missing or incorrect paths

**Fix:**
1. Verify icon files exist:
   ```bash
   ls -la assets/icon-*.png
   ```
   Should show: icon-16.png, icon-32.png, icon-64.png, icon-80.png

2. Generate if missing:
   ```bash
   node extract-simple.js
   ```

3. Check manifest.xml references correct paths

---

### Issue: Context menu "Analyze Term" not appearing

**Cause:** Context menus only work in Word Desktop

**Not supported:**
- Word Online
- Word on iPad
- Word on mobile

**Workaround:**
Use manual selection in Term tab instead.

---

### Issue: Margins/Page Size Fix does nothing

**Cause:** Word Online doesn't support page setup API

**Solutions:**
1. Use Word Desktop (2016+)
2. Manually set in Word:
   - Layout → Margins → Custom Margins
   - Layout → Size → A4 or Letter

---

### Issue: Translation doesn't switch all text

**Debug:**
1. Check browser console for errors
2. Verify translation key exists in both KOR and ENG
3. Refresh add-in (close and reopen)

**Report bug:**
- Note which text didn't change
- Include screenshot
- Open GitHub issue

---

## Uninstallation

### Word Online

1. Insert → Add-ins → My Add-ins
2. Hover over PaperPilot
3. Click "..." menu → Remove

### Word Desktop (Windows)

**Method 1: Through UI**
1. Developer → Add-ins
2. Select PaperPilot
3. Click Remove

**Method 2: Delete Manifest**
```
C:\Users\USERNAME\AppData\Local\Microsoft\Office\16.0\Wef\manifest.xml
```

**Method 3: Registry (if using registry method)**
1. Win+R → `regedit`
2. Navigate to:
   ```
   HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\WEF\Developer
   ```
3. Delete PaperPilot key

### Word Desktop (macOS)

```bash
rm ~/Library/Containers/com.microsoft.Word/Data/Documents/wef/manifest.xml
```

Restart Word.

---

## Advanced Configuration

### Custom API Server

To use your own API server:

1. **Clone server code:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/PaperPilot-Server.git
   cd PaperPilot-Server
   ```

2. **Configure and deploy:**
   - Follow server setup instructions above
   - Deploy to your preferred platform

3. **Update client:**
   ```bash
   # Development
   # Edit webpack.config.js proxy settings

   # Production
   # Set API_SERVER_URL in Vercel environment variables
   ```

### Custom Manifest

To change add-in name or icons:

1. **Edit manifest.xml:**
   ```xml
   <DisplayName DefaultValue="My Custom Name"/>
   <IconUrl DefaultValue="https://your-domain.com/icon-32.png"/>
   ```

2. **Update icons:**
   - Replace files in `assets/` folder
   - Ensure sizes: 16x16, 32x32, 64x64, 80x80

3. **Reload add-in:**
   - Remove old version
   - Upload updated manifest.xml

---

## Verification Checklist

After installation, verify:

- [ ] Add-in loads without errors
- [ ] Language toggle works (KOR ↔ ENG)
- [ ] Can select format profile
- [ ] Scan functions work (Cite, Format, Review)
- [ ] Fix buttons apply changes
- [ ] Term analysis connects to server (if API key set)
- [ ] Icons display in ribbon
- [ ] No console errors (F12 DevTools)

---

## Getting Help

If you encounter issues not covered here:

1. **Check documentation:**
   - [USER_GUIDE.md](USER_GUIDE.md) - Troubleshooting section
   - [TECHNICAL_REPORT.md](TECHNICAL_REPORT.md) - Known limitations

2. **Search existing issues:**
   - GitHub Issues: https://github.com/YOUR_USERNAME/PaperPilot/issues

3. **Open new issue:**
   - Include: OS, Word version, error messages, screenshots
   - Steps to reproduce
   - Expected vs actual behavior

4. **Community support:**
   - GitHub Discussions (if enabled)
   - Stack Overflow tag: `paperpilot`

---

## Next Steps

After installation:

1. **Read User Guide:** [USER_GUIDE.md](USER_GUIDE.md)
2. **Try example document:** Create test document with captions, citations
3. **Select profile:** Choose your target journal/university
4. **Run Full Check:** Format tab → Full Check
5. **Explore features:** Try all four tabs (Term, Cite, Format, Review)

---

**Installation complete!** Start using PaperPilot to prepare your academic papers. 🚀

**Last Updated:** 2026-02-20 (v1.4.0)
