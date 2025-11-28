# Cloudflare Account Provisioning Tool

This tool is a serverless web application built on **Cloudflare Workers**. It provides a secure, internal interface for engineering teams (MSPs) to instantly provision new Cloudflare accounts.
This tool is designed **only** for Cloudflare Accounts that are within a partnership with Cloudflare: E.g. Agency or MSSP

Instead of navigating the Cloudflare Dashboard manually, an engineer simply enters a customer name, and this tool:
1. Creates the standard Cloudflare account via API.
2. Locates the Administrator role ID.
3. Automatically invites/adds a pre-defined list of engineering team members to the new account.

## Features

* **Serverless:** Runs entirely on Cloudflare Workers.
* **Secure:** API credentials are stored in encrypted environment variables, not in the code.
* **User Friendly:** Clean, modern HTML interface with Cloudflare branding.
* **Automated Member Management:** Automatically adds your engineering team to every new account.
* **Fun UI:** "Submit" button cycles through random engineering phrases (e.g., "Let There Be Cloud", "Spawn Instance").

---

## Prerequisites

* **Node.js** and **npm** installed.
* **Cloudflare Account** (with permissions to create accounts).
* **Wrangler CLI** installed globally or locally.

---

## Installation & Setup

### 1. Create a Cloudflare Worker

You need to create a new Worker project.

Install Wrangler (CLI): 
```bash
npm install -g wrangler
```
Login: 
```bash
wrangler login
```
Create Project: 
```bash
wrangler init account-creator
```
1. Worker Type: Worker Only
2. Do you want to use TypeScript? No - select JavaScript
3. Do you want to deploy your application - No, we need to config it first!

Replace the content of src/index.js with the "index.js" in this Repo. This combines the Frontend (HTML) and Backend (API Logic).

## 2. Install Dependencies

This project uses wrangler to build and deploy.

```bash
npm install
```

## 3. Project Configuration (wrangler.jsonc)

Ensure your wrangler.jsonc file is configured with your worker name and routes.

```bash
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "account-creator",
  "main": "src/index.js",
  "compatibility_date": "2025-11-27",
  "observability": {
    "enabled": true
  },
  "routes": [
    {
      "pattern": "tool.your-domain.com",
      "custom_domain": true
    }
  ]
}
```
# Secrets Management

### IMPORTANT: Do not store credentials in wrangler.jsonc or the code. Use Cloudflare Secrets.

Run the following commands in your terminal to upload your secrets to the Worker:

1. Cloudflare Email: The email address of the Super Admin.
```bash
npx wrangler secret put CLOUDFLARE_EMAIL
```

2. Cloudflare API Key: The Global API Key (found in My Profile > API Tokens).
```bash
npx wrangler secret put CLOUDFLARE_API_KEY
```

3. Member Emails: A comma-separated list of emails to invite to new accounts.
```bash
npx wrangler secret put MEMBER_EMAILS
# Enter value like: tech1@example.com,tech2@example.com,manager@example.com
```

Due to Limits with Agency Tenancy at this time, the member emails are added as "Administrator"; you can't control further than that, other than Minimum Admin which is Read-Only.
With Agency Partnership you can only have ONE Superadmin, which is your Partnership email in variable 1, this cannot be changed.

# Local Development

To run the worker locally for testing:

```bash
npx wrangler dev
```
This will start a local server (usually at http://localhost:8787) where you can test the UI.

# Deployment

To deploy the worker to the Cloudflare Edge:
```bash
npx wrangler deploy
```
If you have connected this repository to Cloudflare Workers via GitHub, pushing to the main branch will automatically trigger a deployment.

# Security - Cloudflare Zero Trust

Since this tool has the power to create accounts using your Global API Key, it must be protected.

1. Go to the Cloudflare Zero Trust Dashboard.
2. Navigate to Access > Applications.
3. Create a Self-hosted application.
4. Set the Application Domain to match the route defined in wrangler.jsonc (e.g., tool.your-domain.com).
5. Create a Policy (e.g., "Engineers Only") allowing access only to specific email addresses or email domains (e.g., @yourcompany.com), recommend you use Entra ID or Google Workspace sign in control
