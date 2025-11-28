export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Serve the HTML Form (GET Request)
    if (request.method === "GET") {
      return new Response(htmlForm(), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Handle Form Submission (POST Request)
    if (request.method === "POST") {
      try {
        const formData = await request.formData();
        const accountName = formData.get("accountName");

        if (!accountName) return new Response("Account Name is required", { status: 400 });

        const results = await createAccountAndAddMembers(accountName, env);
        return new Response(htmlSuccess(results), {
          headers: { "Content-Type": "text/html" },
        });

      } catch (error) {
        return new Response(htmlError(error.message), {
          headers: { "Content-Type": "text/html" },
        });
      }
    }

    return new Response("Method not allowed", { status: 405 });
  },
};

// CORE LOGIC

async function createAccountAndAddMembers(accountName, env) {
  const headers = {
    "Content-Type": "application/json",
    "X-Auth-Email": env.CLOUDFLARE_EMAIL,
    "X-Auth-Key": env.CLOUDFLARE_API_KEY,
  };

  const logs = [];
  const log = (msg) => logs.push(msg);

  // Create Account
  log(`Creating account: ${accountName}...`);
  const createResp = await fetch("https://api.cloudflare.com/client/v4/accounts", {
    method: "POST",
    headers,
    body: JSON.stringify({ name: accountName, type: "standard" }),
  });
  const createData = await createResp.json();
  
  if (!createData.success) throw new Error("Create Account Failed: " + JSON.stringify(createData.errors));
  
  const accountId = createData.result.id;
  log(`Account created! ID: ${accountId}`);

  // Get Admin Role ID
  const rolesResp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/roles`, { headers });
  const rolesData = await rolesResp.json();
  const adminRole = rolesData.result.find(r => r.name === "Administrator");
  
  if (!adminRole) throw new Error("Administrator role not found.");
  const roleId = adminRole.id;

  // Add Members
  const members = env.MEMBER_EMAILS.split(",").map(e => e.trim());

  for (const email of members) {
    if (!email) continue;
    log(`Adding member: ${email}...`);
    
    // Attempt Direct Add (status: accepted)
    let addResp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/members`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, roles: [roleId], status: "accepted" }),
    });
    let addData = await addResp.json();

    // Fallback: If "Direct Add" is forbidden (Error 1001), try "Invite" (status: pending)
    if (!addData.success && JSON.stringify(addData.errors).includes("accepted")) {
       log(`Direct Add not allowed for ${email}. Falling back to Invite...`);
       addResp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/members`, {
          method: "POST",
          headers,
          body: JSON.stringify({ email, roles: [roleId], status: "pending" }),
       });
       addData = await addResp.json();
    }

    if (addData.success) {
      log(`Member ${email} added successfully.`);
    } else {
      log(`Failed to add ${email}: ${JSON.stringify(addData.errors)}`);
    }
  }

  return logs;
}

// STYLES & SVGs

const STYLES = `
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --cf-orange: #F6821F;
      --cf-orange-hover: #d46b14;
      --gray-900: #1d1d1d;
      --gray-600: #525252;
      --gray-100: #f4f4f5;
      --white: #ffffff;
      --danger: #dc2626;
      --success: #16a34a;
    }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background-color: var(--gray-100);
      color: var(--gray-900);
      margin: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .card {
      background: var(--white);
      padding: 2.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      width: 100%;
      max-width: 480px;
      border-top: 4px solid var(--cf-orange);
    }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; letter-spacing: -0.025em; }
    h2 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--gray-600); font-weight: 600; margin: 0 0 1rem 0; }
    label { font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; display: block; }
    input[type="text"] {
      width: 100%; box-sizing: border-box; padding: 0.75rem; border-radius: 6px; border: 1px solid #d4d4d8; font-size: 1rem; margin-bottom: 1.5rem; transition: border-color 0.2s;
    }
    input[type="text"]:focus { outline: none; border-color: var(--cf-orange); ring: 2px solid rgba(246, 130, 31, 0.2); }
    button {
      background-color: var(--cf-orange); color: white; width: 100%; padding: 0.75rem; border: none; border-radius: 6px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: background-color 0.2s;
    }
    button:hover { background-color: var(--cf-orange-hover); }
    .log-container { background: #1e1e1e; color: #00ff00; font-family: 'Monaco', 'Consolas', monospace; padding: 1rem; border-radius: 6px; font-size: 0.85rem; margin: 1.5rem 0; overflow-x: auto; white-space: pre-wrap; line-height: 1.5; max-height: 300px; overflow-y: auto; }
    .log-item { display: flex; align-items: flex-start; margin-bottom: 4px; }
    .link-btn { text-decoration: none; color: var(--gray-600); font-size: 0.875rem; display: block; text-align: center; margin-top: 1rem; font-weight: 500; }
    .link-btn:hover { color: var(--cf-orange); }
    .icon { width: 20px; height: 20px; margin-right: 8px; flex-shrink: 0; }
  </style>
`;

// HTML FUNCTIONS

function htmlForm() {
  // Button Phrases List
  const buttonPhrases = [
    "Let There Be Cloud",
    "Spawn Instance",
    "Open Shop",
    "Go Orange",
    "Make it Fast",
    "Deploy the Cloud",
    "Materialise",
    "Plant the Flag",
    "Spin Up Env",
    "Provision Core",
    "Push to Prod",
    "Go Supersonic",
    "Engage Warp Speed",
    "Launch Sequence",
    "sudo make account",
    "Initialise Tenant",
    "Boot Up",
    "Go Live",
    "Open Stargate",
    "Establish Uplink",
    "Boot Mainframe",
    "Dock Mothership",
    "Ascend",
    "mkdir /home",
    "Provision Cluster",
    "Allocate Resources",
    "Resolve Dependencies",
    "Construct Pylons",
    "New Game +",
    "Generate World",
    "Press Start",
    "Craft Base",
    "Unlock Map",
    "Beam Me Up",
    "To Infinity",
    "Do the Thing",
    "One Tenant, Please",
    "Behold, My Stuff",
    "Light the Fuse",
    "Shut Up and Build",
    "Push the Button",
    "Let's Goooooo",
    "Mount Volume"
  ];

  const randomLabel = buttonPhrases[Math.floor(Math.random() * buttonPhrases.length)];

  // Return the HTML
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Create Account</title>
      ${STYLES}
    </head>
    <body>
      <div class="card">
        <h2>MSP Tools</h2>
        <h1>Create Cloudflare Account</h1>
        <p style="color: #525252; font-size: 0.9rem; margin-bottom: 1.5rem; line-height: 1.5;">
          Enter the Customer Name below. This will provision the account, set administrator roles, and add the required engineering members.
        </p>
        <form method="POST">
          <label for="accountName">New Account Name</label>
          <input type="text" id="accountName" name="accountName" placeholder="e.g. FG1234 - Acme Corp Production" required autocomplete="off">
          
          <button type="submit">${randomLabel}</button>
          
        </form>
      </div>
    </body>
    </html>
  `;
}

function htmlSuccess(logs) {
  // SVG for Checkmark
  const checkIcon = `<svg class="icon" fill="none" stroke="#22c55e" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Success</title>
      ${STYLES}
    </head>
    <body>
      <div class="card">
        <div style="text-align: center; margin-bottom: 1rem;">
          <svg style="width: 48px; height: 48px; color: var(--success);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <h1 style="text-align: center;">Account Created</h1>
        <p style="text-align: center; color: var(--gray-600); font-size: 0.9rem;">The provisioning process has completed.</p>
        
        <div class="log-container">
          ${logs.map(l => `<div class="log-item">${l.includes('✅') ? checkIcon : '> '}<span>${l.replace(/✅/g, '').replace(/⚠️/g, '[!]')}</span></div>`).join('')}
        </div>
        
        <a href="/" class="link-btn">← Return to Dashboard</a>
      </div>
    </body>
    </html>
  `;
}

function htmlError(msg) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Error</title>
      ${STYLES}
    </head>
    <body>
      <div class="card" style="border-top-color: var(--danger);">
        <div style="text-align: center; margin-bottom: 1rem;">
           <svg style="width: 48px; height: 48px; color: var(--danger);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <h1 style="text-align: center;">Provisioning Failed</h1>
        <p style="background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 6px; font-size: 0.9rem; line-height: 1.5; border: 1px solid #fecaca;">
          ${msg}
        </p>
        <a href="/" class="link-btn">← Try Again</a>
      </div>
    </body>
    </html>
  `;
}
