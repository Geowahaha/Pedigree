# 🚀 n8n Setup Guide for Petdegree

Great news! **n8n is running** on your machine.
Follow these steps to complete the setup and connect it to your Magic Cards.

## 1. Create Your Admin Account
1. Open [http://localhost:5678](http://localhost:5678) in your browser.
2. You will see a "Set up owner account" screen.
3. Enter your **Email** and create a **Password**.
   *(This is just for your local n8n, it doesn't notify anyone).*
4. Click **Next** -> skip the survey if you want -> **Get Started**.

## 2. Import Your Facebook Workflow
I have already created the workflow file for you.
1. In n8n, click **"Add workflow"** (top right) or find the **Workflows** menu.
2. Click the **three dots (...)** menu in the top right corner.
3. Select **Import from file**.
4. Navigate to your project folder:
   `d:\Petdegree\breeding-market-modern\automation\`
5. Select `n8n_facebook_workflow.json`.
6. You will see the flow: **Webhook -> Prepare Data -> Facebook Post**.

## 3. Connect Facebook (The Tricky Part)
To post to your Page, n8n needs permission.
1. Double-click the **"Post to Page"** node (the Facebook one).
2. Under "Credential for Facebook Graph API", click **Select Credential** -> **Create New**.
3. You will see a form asking for an **Access Token**.

### How to get a Facebook Access Token (Simplified):
1. Go to [Meta for Developers](https://developers.facebook.com/).
2. Click **My Apps** -> **Create App** -> Select **Business** -> Give it a name (e.g., "Petdegree Auto").
3. In your new App, go to **Add products to your app** and select **Graph API Explorer** (or just go to [Graph API Explorer Tool](https://developers.facebook.com/tools/explorer/)).
4. **Important**: In the "User or Page" dropdown on the right, select **"Get Page Access Token"**.
5. Select your Petdegree Facebook Page.
6. Grant permissions: Ensure `pages_manage_posts` and `pages_read_engagement` are added.
7. Click **Generate Access Token**.
8. **Copy this long text string.**

### Back in n8n:
1. Paste that token into the **Access Token** field.
2. Click **Save**.
3. Now, close the credential window.
4. In the "Post to Page" node, select your **Page** from the dropdown (if it loads) or paste your **Page ID** (found in your Page's "About" section on Facebook).

## 4. Activate & Link
1. Toggle the **Active** switch (top right of the workflow) to **green**.
2. Double-click the **Webhook** node.
3. Click **Webhook URLs** -> **Test URL**.
4. Click part of the URL to copy it.
   *(It looks like: http://localhost:5678/webhook-test/facebook-post-trigger)*
5. Open your project code file `.env` (or `.env.local` or `.env.example`).
6. Update the variable:
   ```
   VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook-test/facebook-post-trigger
   ```
   *(Note: For live use, use the Production URL from n8n).*

## 5. Test It!
1. Go to your Petdegree App (localhost:5173).
2. Create a Magic Card.
3. Check the "Auto-post" box.
4. Watch n8n! The workflow execution label should appear.
