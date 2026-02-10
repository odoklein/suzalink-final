# Vercel Deployment Guide for Suzalink

## 🚀 Pre-Deployment Checklist

### 1. Environment Variables Setup

Before deploying, you need to configure all environment variables in Vercel:

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add ALL variables from `.env.example`
4. **Critical**: Update these URLs for production:
   - `NEXTAUTH_URL` → Your Vercel domain
   - `NEXT_PUBLIC_APP_URL` → Your Vercel domain
   - `GOOGLE_DRIVE_REDIRECT_URI` → Your Vercel domain + callback path

### 2. Database Configuration

- ✅ Supabase connection pooling is already configured
- ✅ Ensure your Supabase project allows connections from Vercel
- ⚠️ Run migrations after first deployment:
  ```bash
  npx prisma migrate deploy
  ```

### 3. Build Configuration

Your `package.json` build script is correct:

```json
"build": "prisma generate && next build"
```

### 4. External Services Checklist

Ensure these services are configured for production:

- [ ] **Ably** - Real-time chat (already configured)
- [ ] **AWS S3** - File storage
- [ ] **Supabase** - Database
- [ ] **Google Drive API** - Update redirect URI
- [ ] **Mistral AI** - AI features
- [ ] **Apollo.io** - Prospect enrichment
- [ ] **Apify** - Web scraping
- [ ] **Pappers** - Company data

### 5. Known Issues to Fix

#### ❌ Prisma Generation Error

The build is currently failing during `prisma generate`. This might be due to:

- Corrupted node_modules
- Missing environment variables during build

**Fix:**

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npx prisma generate
npm run build
```

### 6. Vercel-Specific Considerations

#### Redis/BullMQ Workers

⚠️ **Important**: Your project uses BullMQ workers which require Redis.

- Vercel serverless functions don't support long-running workers
- **Solution**: Deploy workers separately (e.g., Railway, Render, or Vercel Cron Jobs)

#### File Uploads

- ✅ Using AWS S3 (good for Vercel)
- ⚠️ Remove local `uploads/` directory reliance

#### Socket.IO Server

⚠️ **Critical**: `server/socket.ts` won't work on Vercel serverless

- You're now using Ably for real-time (✅ Vercel-compatible)
- Remove or deploy Socket.IO server separately if still needed

### 7. Deployment Steps

1. **Push to GitHub** (if not already done)

   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**
   - Add all variables from `.env.example`
   - Update production URLs

4. **Deploy**
   - Vercel will automatically deploy
   - Monitor build logs for errors

5. **Post-Deployment**

   ```bash
   # Run database migrations
   npx prisma migrate deploy

   # Seed database if needed
   npx prisma db seed
   ```

### 8. Performance Optimizations for Production

- ✅ Ably real-time (serverless-compatible)
- ✅ Optimistic UI updates
- ✅ Lazy-loaded components
- ✅ Database connection pooling
- ⚠️ Consider adding Redis for caching (Upstash Redis works with Vercel)

### 9. Post-Deployment Monitoring

Monitor these after deployment:

- [ ] Database connection limits (Supabase pooler)
- [ ] Ably message quota
- [ ] AWS S3 storage usage
- [ ] API rate limits (Apollo, Apify, etc.)
- [ ] Vercel function execution time (10s limit on Hobby, 60s on Pro)

### 10. Recommended Vercel Plan

Based on your features:

- **Hobby Plan**: Good for testing, but has limitations
- **Pro Plan**: Recommended for production
  - Longer function execution (60s vs 10s)
  - More bandwidth
  - Better analytics

## 🔧 Current Blockers

### Must Fix Before Deployment:

1. ❌ **Prisma build error** - Run clean install and test build locally
2. ⚠️ **Workers/Background Jobs** - Deploy separately or use Vercel Cron
3. ⚠️ **Socket.IO server** - Already migrated to Ably ✅

### Optional Improvements:

- Add Redis caching (Upstash)
- Set up monitoring (Sentry, LogRocket)
- Configure CDN for static assets
- Add rate limiting middleware

## 📝 Next Steps

1. Fix Prisma build locally
2. Test production build: `npm run build`
3. If build succeeds, deploy to Vercel
4. Configure all environment variables
5. Test all features in production
6. Set up monitoring and alerts

---

**Status**: ⚠️ **Not Ready** - Fix Prisma build error first
