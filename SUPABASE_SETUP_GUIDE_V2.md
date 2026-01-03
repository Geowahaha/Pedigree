# 🚀 Ultimate Supabase Social Login Setup Guide (Production Ready)

This guide will walk you through setting up Google, GitHub, Apple, and LINE login providers for your Petdegree application. Follow these steps exactly to move from "Demo Mode" to "Production Mode".

---

## 🛑 Prerequisite: Get Your Supabase Callback URL
1. Go to your **Supabase Dashboard** > **Authentication** > **Providers**.
2. Click on **Google** (even if not enabled yet).
3. Copy the **Callback URL (Redirect URL)** at the top.
   - It usually looks like: `https://<YOUR-PROJECT-ID>.supabase.co/auth/v1/callback`
   - **Keep this URL safe!** You need it for ALL providers.

---

## 1. Google Login Setup (Most Popular)
**Goal:** Get `Client ID` and `Client Secret`.

1. Go to **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Create a new Project (e.g., "Petdegree Prod").
3. **Step 3.1: Configure OAuth Consent Screen**
   - Go to **APIs & Services** > **OAuth consent screen**.
   - Select **External** > Click **Create**.
   - **App Name:** Petdegree
   - **User Support Email:** Your email.
   - **Developer Contact Email:** Your email.
   - Click **Save and Continue** until finished. (No need to add scopes/test users strictly if you publish, but for testing, add your email as a test user).
4. **Step 3.2: Create Credentials**
   - Go to **APIs & Services** > **Credentials**.
   - Click **+ CREATE CREDENTIALS** > **OAuth client ID**.
   - **Application Type:** Web application.
   - **Name:** Supabase Login.
   - **Authorized JavaScript origins:**
     - `https://petdegree.vercel.app` (Your Production URL)
     - `http://localhost:5173` (For local testing)
   - **Authorized redirect URIs:**
     - **PASTE YOUR SUPABASE CALLBACK URL HERE** (from Prerequisite step).
   - Click **Create**.
5. **Step 3.3: Copy Keys to Supabase**
   - Copy the **Client ID** and **Client Secret**.
   - Go to **Supabase** > **Auth** > **Providers** > **Google**.
   - Paste the keys and toggle **Enable Sign in with Google** to **ON**.
   - Click **Save**.

---

## 2. GitHub Login Setup (Developer Favorite)
**Goal:** Get `Client ID` and `Client Secret`.

1. Go to **[GitHub Developer Settings](https://github.com/settings/developers)**.
2. Click **New OAuth App**.
3. **Application Name:** Petdegree
4. **Homepage URL:** `https://petdegree.vercel.app`
5. **Authorization callback URL:**
   - **PASTE YOUR SUPABASE CALLBACK URL HERE**.
6. Click **Register application**.
7. Copy **Client ID**.
8. Click **Generate a new client secret** and copy it.
9. **Step 2.1: Supabase Setup**
   - Go to **Supabase** > **Auth** > **Providers** > **GitHub**.
   - Paste keys, Enable, and Save.

---

## 3. LINE Login Setup (Thailand Favorite)
**Goal:** Get `Channel ID` and `Channel Secret`.

1. Go to **[LINE Developers Console](https://developers.line.biz/console/)**.
2. Log in with your LINE account.
3. Keep or Create a **Provider**.
4. Click **Create a new Channel** > **LINE Login**.
5. Fill in details (Name, Description, Icon, etc.).
6. Under **Snippet**, select "Web app" for App Type.
7. **Step 3.1: Config**
   - Go to the **LINE Login** tab.
   - **Callback URL:**
     - **PASTE YOUR SUPABASE CALLBACK URL HERE**.
     - Note: LINE might require the URL to be `https` (localhost might tricky without tunneling, but works for Vercel).
   - Enable **Web App**.
8. **Step 3.2: Get Keys**
   - Go to **Basic Settings** tab.
   - Copy **Channel ID** (this is Client ID).
   - Copy **Channel secret** (this is Client Secret).
9. **Step 3.3: Supabase Setup**
   - Supabase doesn't always have a default "LINE" UI in older projects.
   - If "LINE" is in the provider list: Enable it and paste keys.
   - If NOT: You might need to use **OpenID Connect (OIDC)** beta feature or a custom implementation. For now, check if LINE is listed. If not, use the **Demo Mode** for LINE until you upgrade Supabase to Pro or use a Custom Auth Proxy.

---

## 4. Apple Login Setup (Premium User Base)
**Requirements:** Apple Developer Account ($99/year).

1. Go to **[Apple Developer Identifiers](https://developer.apple.com/account/resources/identifiers/list)**.
2. **Create App ID:**
   - Click `+`. Select **App IDs**. Type "App".
   - Desc: Petdegree. Bundle ID: `com.yourname.petdegree`.
   - Scroll down, Check **Sign In with Apple**. Save.
3. **Create Service ID:**
   - Click `+`. Select **Service IDs**.
   - Identifier: `com.yourname.petdegree.web`.
   - Click Register. Then Click on it to Edit.
   - Check **Sign In with Apple** > Configure.
   - **Domains:** `petdegree.vercel.app`
   - **Return URLs:** **PASTE YOUR SUPABASE CALLBACK URL**.
   - Save.
4. **Create Key (.p8 file):**
   - Go to **Keys**. Click `+`.
   - Name: "Supabase Login". Check **Sign In with Apple**. Configure -> Select primary App ID.
   - Download the `.p8` file. **Keep it safe!**
   - Copy the **Key ID**.
   - Copy your **Team ID** (top right of screen).
5. **Step 4.1: Supabase Setup**
   - Go to Supabase > Providers > Apple.
   - **Client ID:** Your Service ID (`com.yourname.petdegree.web`).
   - **Team ID:** Your Team ID.
   - **Key ID:** Your Key ID.
   - **Private Key:** Open the `.p8` file with Text Editor, copy EVERYTHING (including `-----BEGIN PRIVATE KEY-----`).
   - Enable and Save.

---

## 5. FINAL STEP: Supabase URL Configuration
**Critical Step to prevent redirect errors.**

1. Go to **Supabase** > **Authentication** > **URL Configuration**.
2. **Site URL:** Set to your Production URL: `https://petdegree.vercel.app`
3. **Redirect URLs:** Add the following:
   - `http://localhost:5173`
   - `http://localhost:3000`
   - `https://petdegree.vercel.app`
   - `https://petdegree.vercel.app/auth/callback` (Optional but good practice)

---

## 🎉 Done!
Once you configure these, flip the switch in the **AuthModal** back to "Real Mode" (Toggle Off Demo Mode) and test it out!
