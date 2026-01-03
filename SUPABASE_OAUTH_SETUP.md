# Supabase OAuth Configuration Guide

To enable Google, GitHub, and LINE login for Petdegree, you need to configure your Supabase project.

## 1. Google OAuth Setup

1.  **Google Cloud Console**:
    *   Go to [https://console.cloud.google.com/](https://console.cloud.google.com/).
    *   Create a new project or select an existing one.
    *   Go to **APIs & Services > Credentials**.
    *   Click **Create Credentials** -> **OAuth client ID**.
    *   **Application type**: Web application.
    *   **Name**: Petdegree (or your choice).
    *   **Authorized JavaScript origins**: `https://<your-project-ref>.supabase.co` (find this in Supabase Dashboard > Settings > API).
    *   **Authorized redirect URIs**: `https://<your-project-ref>.supabase.co/auth/v1/callback`.
    *   Click **Create**.
    *   Copy the **Client ID** and **Client Secret**.

2.  **Supabase Dashboard**:
    *   Go to your project > **Authentication** > **Providers**.
    *   Select **Google**.
    *   Enable **Google enabled**.
    *   Paste the **Client ID** and **Client Secret**.
    *   Click **Save**.

## 2. GitHub OAuth Setup

1.  **GitHub Settings**:
    *   Go to [https://github.com/settings/developers](https://github.com/settings/developers).
    *   Click **New OAuth App**.
    *   **Application Name**: Petdegree.
    *   **Homepage URL**: `http://localhost:5173` (or your production URL).
    *   **Authorization callback URL**: `https://<your-project-ref>.supabase.co/auth/v1/callback`.
    *   Click **Register application**.
    *   Copy the **Client ID**.
    *   Generate a **New Client Secret** and copy it.

2.  **Supabase Dashboard**:
    *   Go to **Authentication** > **Providers**.
    *   Select **GitHub**.
    *   Enable **GitHub enabled**.
    *   Paste the **Client ID** and **Client Secret**.
    *   Click **Save**.

## 3. LINE Login Setup

1.  **LINE Developers Console**:
    *   Go to [https://developers.line.biz/](https://developers.line.biz/).
    *   Log in and create a new **Provider** if needed.
    *   Create a new **LINE Login** channel.
    *   **Channel Type**: LINE Login.
    *   **Provider**: Choose your provider.
    *   **Channel Name**: Petdegree.
    *   **Channel Description**: Login for Petdegree.
    *   **App Types**: Web app.
    *   Complete the creation form.
    *   In the **Channel settings** tab, find **Channel ID** and **Channel Secret**.
    *   In the **LINE Login** tab, scroll to **Callback URL**.
    *   Click **Edit** and add: `https://<your-project-ref>.supabase.co/auth/v1/callback`.
    *   **Important**: Enable "OpenID Connect" in the Email address permission section if you want to capture user emails.

2.  **Supabase Dashboard**:
    *   Go to **Authentication** > **Providers**.
    *   Select **LINE** (if available) or check documentation for generic OIDC if LINE is not natively listed in UI (Supabase natively supports LINE now in beta or via custom mapped providers, but usually it's under the list).
    *   *Note: If LINE is not in the list, you may need to use "OpenID Connect" generic provider or wait for Supabase update. However, standard Supabase usually lists it.*
    *   Paste **Channel ID** (Client ID) and **Channel Secret**.
    *   Click **Save**.

## 4. Redirect URLs

1.  **Supabase Dashboard**:
    *   Go to **Authentication** > **URL Configuration**.
    *   **Site URL**: `http://localhost:5173` (for local dev).
    *   **Redirect URLs**: Add `http://localhost:5173/**`.
