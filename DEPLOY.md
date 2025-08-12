# Deployment Instructions for Ghostwriter Portal

## Quick Deploy to Vercel

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/new
   
2. **Import Git Repository**
   - Click "Import Git Repository"
   - Select: `ghostwriter-portal`
   - Repository: https://github.com/eimribar/ghostwriter-portal

3. **Configure Project**
   - Framework Preset: **Vite** (should auto-detect)
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Environment Variables** (Optional for now)
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment (usually 1-2 minutes)

### Option 2: Deploy via CLI

1. **Login to Vercel**
   ```bash
   npx vercel login
   ```

2. **Deploy to Production**
   ```bash
   npx vercel --prod
   ```
   
   When prompted:
   - Set up and deploy: Y
   - Which scope: Select your account
   - Link to existing project?: N (first time) or Y (updates)
   - Project name: ghostwriter-portal
   - Directory: ./
   - Build command: npm run build
   - Output directory: dist
   - Development command: npm run dev

## Expected URL

Your app will be available at:
- Production: `https://ghostwriter-portal.vercel.app`
- Preview: `https://ghostwriter-portal-[hash].vercel.app`

## Post-Deployment Checklist

- [ ] Verify all pages load correctly
- [ ] Test navigation between pages
- [ ] Check responsive design on mobile
- [ ] Verify mock data displays properly
- [ ] Test all modals and interactions

## Updating Deployment

After making changes:

1. **Commit and push to GitHub**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **Automatic deployment**
   - Vercel will automatically deploy on push to main branch

## Troubleshooting

If deployment fails:

1. **Check build logs** in Vercel dashboard
2. **Common issues**:
   - TypeScript errors: Run `npm run build` locally first
   - Missing dependencies: Check package.json
   - Environment variables: Add in Vercel settings

## Features Available

Once deployed, you'll have access to:

- **Content Lake** - Browse creators and posts
- **Ideation** - Manage content ideas
- **Generate** - Create content variations
- **Schedule** - Content calendar
- **Clients** - Client management
- **Analytics** - Coming soon
- **Settings** - Coming soon

## Support

- Vercel Docs: https://vercel.com/docs
- GitHub Repo: https://github.com/eimribar/ghostwriter-portal