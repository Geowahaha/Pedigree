# Social Login Setup Guide for Petdegree

To enable real social login functionality, you need to configure OAuth providers in your Supabase project.

## 1. Google Login
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Search for "APIs & Services" > "Credentials".
4. Click **Create Credentials** > **OAuth client ID**.
5. Select **Web application**.
6. Under **Authorized redirect URIs**, add your Supabase callback URL:
   - Go to Supabase > Authentication > Providers > Google to find this URL.
   - It looks like: `https://<your-project-ref>.supabase.co/auth/v1/callback`
7. Copy the **Client ID** and **Client Secret**.
8. Paste them into Supabase under Authentication > Providers > Google.
9. Enable the provider in Supabase.

## 2. GitHub Login
1. Go to [GitHub Developer Settings](https://github.com/settings/developers).
2. Click **New OAuth App**.
3. Fill in the details:
   - Homepage URL: Your Vercel URL (e.g., `https://petdegree.vercel.app`)
   - Authorization callback URL: Your Supabase callback URL (same as above).
4. Click **Register application**.
5. Copy the **Client ID** and generate a new **Client Secret**.
6. Paste them into Supabase under Authentication > Providers > GitHub.
7. Enable the provider in Supabase.

## 3. Apple Login (Requires Apple Developer Account)
1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list).
2. Create an **App ID** enabled with "Sign In with Apple".
3. Create a **Service ID**:
   - Enable "Sign In with Apple".
   - Configure it with your domain (Vercel URL) and Supabase callback URL.
4. Generate a **Private Key (.p8 file)** for Sign In with Apple.
5. In Supabase > Authentication > Providers > Apple:
   - Client ID: Your Service ID (e.g., `com.petdegree.web`).
   - Team ID: Your Apple Team ID.
   - Key ID: The ID of your Private Key.
   - Private Key: The contents of the the .p8 file.
6. Enable the provider.

## 4. LINE Login (Custom Provider or OIDC)
LINE is not a default provider in Supabase's free tier UI in some regions, but can be added via **OpenID Connect (OIDC)** or as a custom implementation.

1. Go to [LINE Developers Console](https://developers.line.biz/).
2. Create a new provider and a new channel (LINE Login).
3. In "App settings", find **Channel ID** and **Channel secret**.
4. In "LINE Login" settings, enable "Web app" and add your callback URL.
5. **Setup in Supabase:**
   - Since Supabase doesn't have a direct "LINE" button in the dashboard, you typically use `signInWithOAuth({ provider: 'line' })` if your Supabase project supports OIDC beta, OR you might need to use a custom function.
   - *However*, for Petdegree, we have implemented the frontend call as `signInWithOAuth('line')`. Ensure 'Line' is enabled in your Supabase Authentication Providers list if available, or configure it as an OIDC provider using LINE's OIDC discovery URL: `https://access.line.me/.well-known/openid-configuration`.

## IMPORTANT: Redirect URLs
In Supabase > Authentication > URL Configuration:
- Add your Vercel production URL (e.g., `https://petdegree.vercel.app`) to "Redirect URLs".
- Also add `http://localhost:5173` for local testing.

Once these steps are done, the buttons in `AuthModal` will automatically work!
