# Google OAuth Setup Guide

## Overview

Google OAuth authentication has been integrated into your Samossa app. Users can now sign in using their Google account in addition to the traditional username/password method.

## What Was Added

### Backend Changes

1. **Database Schema** - Updated `shared/schema.ts`:
   - Added `googleId` field to users table (unique)
   - Added `email` field to users table
   - Made `username` and `password` optional (for OAuth users)

2. **Storage Layer** - Updated `server/storage.ts`:
   - Added `getUserByGoogleId()` method
   - Added `createUserFromGoogle()` method
   - Updated database initialization script

3. **API Endpoint** - Updated `server/routes.ts`:
   - Added `/api/auth/google-callback` endpoint
   - Verifies Google ID tokens using `google-auth-library`
   - Auto-creates users on first Google sign-in
   - Returns session token like traditional auth

### Frontend Changes

1. **Auth Context** - Updated `client/src/lib/auth.tsx`:
   - Added `googleLogin()` method
   - Accepts Google ID tokens from frontend

2. **Google Sign-In Component** - New `client/src/components/GoogleSignInButton.tsx`:
   - Renders official Google Sign-In button
   - Handles Google response callback
   - Calls backend to exchange token

3. **Auth Page** - Updated `client/src/pages/Auth.tsx`:
   - Integrated Google Sign-In button
   - Added divider between traditional and OAuth methods

4. **HTML** - Updated `client/index.html`:
   - Added Google Sign-In library script tag

## Setup Instructions

### 1. Get Google Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable "Google+ API"
4. Go to "Credentials" → Create OAuth 2.0 Client ID
5. Select "Web application"
6. Add authorized JavaScript origins:
   - `http://localhost:5173` (development)
   - `http://localhost:3000` (if running on different port)
   - Your production domain
7. Add authorized redirect URIs:
   - `http://localhost:5173/auth` (development)
   - Your production auth page URL
8. Copy the **Client ID** (not the secret)

### 2. Configure Environment Variables

Update your environment files in the project root (`.env.development` and/or `.env.production`):

```
GOOGLE_CLIENT_ID=your-client-id-from-step-1
VITE_GOOGLE_CLIENT_ID=your-client-id-from-step-1
```

The frontend reads this via `import.meta.env.VITE_GOOGLE_CLIENT_ID`.

### 3. Verify Dependencies

The `google-auth-library` package is already installed. Check with:

```bash
npm list google-auth-library
```

### 4. Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```
2. Go to the auth page (`/auth`)
3. You should see:
   - Traditional username/password form
   - "Or continue with" divider
   - Google Sign-In button

4. Click the Google button and sign in with a test account

## How It Works

### User Flow

1. User clicks "Sign in with Google"
2. Google opens sign-in popup
3. User authenticates with Google
4. Google returns an ID token
5. Frontend sends ID token to `/api/auth/google-callback`
6. Backend verifies token with Google's servers
7. Backend creates or retrieves user
8. Backend returns session token
9. Frontend stores token in React state
10. User is logged in and redirected home

### Account Linking

- If a user signs in with Google before creating a traditional account, a new Google user is created
- Currently, there's no automatic account linking (Google + username/password account with same email)
- To implement linking, you would need to:
  - Check for existing users by email
  - Prompt user to link accounts
  - Update the existing user with googleId

## Security Notes

- Tokens are verified server-side using Google's official library
- ID tokens are short-lived and cannot be replayed
- Session tokens are stored in React state (not localStorage/cookies)
- No passwords are transmitted for OAuth users
- Do not expose `GOOGLE_CLIENT_SECRET` in frontend code

## Troubleshooting

### "Google Sign-In library not loaded"

- Ensure `client/index.html` includes the Google script tag
- Check browser console for CORS or script loading errors
- Verify internet connection (script comes from googleapis.com)

### "VITE_GOOGLE_CLIENT_ID not configured"

- Add `GOOGLE_CLIENT_ID` to `.env` file
- Restart dev server after adding to `.env`
- The variable must start with `VITE_` prefix to be exposed to frontend

### "auth failed" when clicking Google button

- Verify Client ID is correct in `.env`
- Check that authorized origins include your current URL
- Check server logs for the exact error
- Ensure backend can reach Google's servers

### Users can't sign in with Google but can with username/password

- Check browser DevTools Network tab for `/api/auth/google-callback` request
- Look for errors in server logs
- Verify `GOOGLE_CLIENT_ID` environment variable is set on server

## Next Steps

- Test with multiple Google accounts
- Implement account linking if needed
- Add email verification for OAuth users
- Set up error tracking for production
- Test on different devices/browsers
