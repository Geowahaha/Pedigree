# How to Get Affiliate API Access (Shopee & Lazada Thailand)

To automatically fetch products and generate tracked links, you need **Affiliate API** access. This is different from the "Seller API".

## 1. Shopee Thailand Affiliate
Most users start with the basic dashboard, but for API access:

1.  **Log in** to your [Shopee Affiliate Portal](https://affiliate.shopee.co.th/).
2.  **Find your Affiliate ID** in Account Settings.
3.  **Request API Access**:
    *   Go to **Help Center** or **Contact Us** in the portal.
    *   Look for "API Integration" or "Open API Request".
    *   Fill out the form (you may need to explain you are building a "Price Comparison" or "Aggregator" site).
4.  **Wait for Approval**: Once approved, you will get an `App ID` and `Secret`.

**Alternative (Easier)**:
*   Just use your **"Universal Link"** (e.g., `https://shope.ee/YOUR_ID`).
*   We can manually append this to any product link without an API.

## 2. Lazada Thailand Affiliate
Lazada manages this through "Lazada AdSense":

1.  **Log in** to [Lazada AdSense / Affiliate](https://adsense.lazada.co.th/).
2.  Navigate to **Integration** > **Open API**.
3.  Click **Apply for Access**.
4.  Approval usually takes ~5 business days.

## Summary for Developer (Me)
If you can get the API Keys, I can build a fully automated "Product Fetcher".

If you **cannot** get API keys (it can be hard for new accounts), we can use the **Manual Link Method**:
*   You give me your **Affiliate ID** (Sub_id).
*   I write a script to turn `shopee.co.th/product/123` into `shopee.co.th/product/123?utm_source=YOUR_ID`.
