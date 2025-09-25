# Fix OAuth Branding - Remove Unprofessional Supabase URL

## Problem

When users sign up with Google, they see "You're signing back in to anhltthxqrxtfiuxkisj.supabase.co" which looks unprofessional.

## Solutions (In Order of Preference)

### 🚀 Option 1: Update Google OAuth App Name (QUICKEST FIX)

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project

2. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Update the **Application name** to "Blooma"
   - Update the **Application logo** (upload your logo)
   - Add **Application homepage** (e.g., https://yourdomain.com)
   - Add **Privacy policy link**
   - Add **Terms of service link**

3. **Update Authorized Domains**
   - Under "Authorized domains", add your production domain
   - This makes the consent screen show your app name instead of the Supabase URL

### 🎯 Option 2: Supabase Vanity Subdomain (PROFESSIONAL)

**Requirements:** Paid Supabase plan

1. **Install Supabase CLI**

   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase CLI**

   ```bash
   supabase login
   ```

3. **Check Subdomain Availability**

   ```bash
   supabase vanity-subdomains check --desired-subdomain blooma
   ```

4. **Activate Vanity Subdomain**

   ```bash
   supabase vanity-subdomains activate --project-ref YOUR_PROJECT_REF --desired-subdomain blooma
   ```

5. **Update Environment Variables**

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://blooma.supabase.co
   ```

6. **Update Google OAuth Settings**
   - Add `https://blooma.supabase.co` to authorized origins
   - Update redirect URIs to use the new domain

### 🏆 Option 3: Custom Domain (MOST PROFESSIONAL)

**Requirements:** Paid Supabase plan + your own domain

1. **Setup CNAME Record**

   ```
   auth.yourdomain.com CNAME anhltthxqrxtfiuxkisj.supabase.co
   ```

2. **Verify Domain with Supabase CLI**

   ```bash
   supabase domains create --project-ref YOUR_PROJECT_REF --custom-hostname auth.yourdomain.com
   ```

3. **Add Required TXT Records**
   - Supabase will provide TXT records for domain verification
   - Add these to your DNS settings

4. **Activate Custom Domain**

   ```bash
   supabase domains activate --project-ref YOUR_PROJECT_REF
   ```

5. **Update Environment Variables**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://auth.yourdomain.com
   ```

## Immediate Action Items

1. **Start with Option 1** - Update Google OAuth app name to "Blooma"
2. **Consider upgrading** to a paid Supabase plan for vanity subdomain
3. **Plan for custom domain** if you want maximum professionalism

## Testing

After implementing any option:

1. Clear browser cache and cookies
2. Test Google sign-in flow
3. Verify the consent screen shows "Blooma" instead of the Supabase URL

## Notes

- Option 1 can be implemented immediately and is free
- Options 2 & 3 require paid Supabase plans but provide better branding
- All options improve user trust and professionalism
