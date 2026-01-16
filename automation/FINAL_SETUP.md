
# ⚡️ Facebook Autopost Setup (FINAL STEP)

I have updated the n8n workflow file with your specific Page ID (`1524899624269342`).
Since I cannot remotely paste the credential into your running n8n instance, you need to do this quickly:

### 1. Re-import the Workflow
1. In n8n (http://localhost:5678), delete the previous "Social Auto-Post" workflow if it exists.
2. Click **Add workflow** -> **Import from file**.
3. Select `d:\Petdegree\breeding-market-modern\automation\n8n_facebook_workflow.json`.

### 2. Add Credentials (ONE TIME)
1. Double-click the **"Post to Page"** node.
2. Click **Select Credential** -> **Create New**.
3. **DELETE** anything in the Access Token box.
4. **PASTE** this exact token (your Page Access Token):
   ```
   EAAWrnZBZBXfz4BQXigbmyOLUkaHza12zgTqCMO32yLbnHPeyrrkfH0LpsSlxUVcwfB0aPLSPAVQIpQ4zv9aOBW5gzgbFLZAZCjRVG7uxCW2rNBeBac7kQcxIefAe41ZCQA1crMMnBdujZAMHbydwmvSj7TSuahE6IYhTmD8OnLtbGFX9hZCRy6yhqOPN8j41G9LKNYLPAVjlkNMjHD5alHoZAFBzLbDKyUKY43CXpNSXaeI6AE5W6Qqy
   ```
5. Click **Save**.
6. Close the dialog. It should now be selected.
7. Do the same for the "Add Link Comment" node (select the credential you just made).

### 3. Activate
1. Toggle **Active** (green switch at top right).
2. Double check the webhook URL in `.env` matches the Test URL in n8n.

### 4. Done!
Go to localhost:3000 and create a card.
