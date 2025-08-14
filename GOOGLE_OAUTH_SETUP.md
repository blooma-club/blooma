# Google OAuth Setup for Supabase

To enable Google sign-in functionality in your Blooma application, you need to configure Google OAuth in your Supabase project.

## Prerequisites

1. A Supabase project
2. A Google Cloud Console project
3. Google OAuth 2.0 credentials

## Step 1: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Choose "Web application" as the application type
6. Add your authorized redirect URIs:
   - For development: `http://localhost:3000/auth/callback`
   - For production: `https://yourdomain.com/auth/callback`
7. Note down your Client ID and Client Secret

## Step 2: Supabase Configuration

1. Go to your Supabase project dashboard
2. Navigate to "Authentication" → "Providers"
3. Find "Google" in the list and click "Enable"
4. Enter your Google OAuth credentials:
   - **Client ID**: Your Google OAuth Client ID
   - **Client Secret**: Your Google OAuth Client Secret
5. Save the configuration

## Step 3: Environment Variables

Make sure your environment variables are properly set in your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 4: Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to the auth page
3. Click "Continue with Google"
4. You should be redirected to Google's OAuth consent screen
5. After authentication, you'll be redirected back to your dashboard

## Troubleshooting

### Common Issues

1. **Redirect URI mismatch**: Ensure the redirect URI in Google Cloud Console exactly matches your callback URL
2. **CORS errors**: Make sure your domain is properly configured in Google Cloud Console
3. **Authentication state not persisting**: Check that your Supabase configuration is correct

### Testing in Development

- Use `http://localhost:3000/auth/callback` as the redirect URI
- Make sure your Supabase project allows localhost origins

### Production Deployment

- Update the redirect URI to your production domain
- Ensure your Supabase project allows your production domain
- Consider using environment-specific configurations

## Security Considerations

1. **Client Secret**: Never expose your Google OAuth Client Secret in client-side code
2. **Redirect URIs**: Only use HTTPS redirect URIs in production
3. **Scopes**: Only request the minimum scopes needed for your application
4. **User Data**: Handle user data securely and in compliance with privacy regulations

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Next.js Authentication Best Practices](https://nextjs.org/docs/authentication)
