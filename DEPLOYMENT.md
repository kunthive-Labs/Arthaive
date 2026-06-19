# Arthaive Deployment Guide

## Deploying to Vercel

### Prerequisites
- GitHub account
- Vercel account (sign up at https://vercel.com)
- Git repository with your code

### Deployment Steps

#### 1. Push Code to GitHub
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

#### 2. Import Project in Vercel
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure project:
   - Framework Preset: **Next.js**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

#### 3. Deploy
- Click "Deploy"
- Wait for build to complete
- Your site will be live at `your-project.vercel.app`

### Environment Variables
No environment variables required for basic deployment.

### Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed

### Automatic Deployments
Every push to `main` branch will automatically deploy to production.

### Local Development
```bash
npm install
npm run dev
```

Visit http://localhost:3000

### Updating Currency Rate
1. Edit `config/currency.js`
2. Update `USD_TO_INR` value
3. Run `npm run generate-data`
4. Commit and push changes
5. Vercel will auto-deploy

### Build Optimization
The app is optimized for production with:
- Static page generation where possible
- Optimized images
- Code splitting
- Tree shaking

### Support
For issues, check:
- Vercel deployment logs
- Next.js documentation
- Project README.md
