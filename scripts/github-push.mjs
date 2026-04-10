// GitHub push script using Replit Connectors SDK
import { ReplitConnectors } from "@replit/connectors-sdk";
import { execSync } from "child_process";

const connectors = new ReplitConnectors();

async function run() {
  // 1. Get authenticated user
  const userRes = await connectors.proxy("github", "/user", { method: "GET" });
  const user = await userRes.json();
  const username = user.login;
  console.log("Authenticated as:", username);

  // 2. Create the repo (ignore if already exists)
  const createRes = await connectors.proxy("github", "/user/repos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "AirManager",
      description: "A luxury dark-themed short-term rental property management dashboard. Track properties, bookings, guests, revenue, enquiries, reviews, and more.",
      private: false,
      auto_init: false,
    }),
  });
  const repoData = await createRes.json();

  let repoUrl;
  if (createRes.status === 201) {
    console.log("Repo created:", repoData.html_url);
    repoUrl = repoData.clone_url;
  } else if (repoData.errors?.[0]?.message?.includes("already exists") || createRes.status === 422) {
    console.log("Repo already exists, using existing.");
    repoUrl = `https://github.com/${username}/AirManager.git`;
  } else {
    console.error("Failed to create repo:", JSON.stringify(repoData));
    process.exit(1);
  }

  // 3. Get an OAuth token for git push via the connector
  // We'll build the authenticated URL using GITHUB_TOKEN env var (available in replit secrets)
  const token = process.env.GITHUB_TOKEN;
  const authUrl = `https://${token}@github.com/${username}/AirManager.git`;

  // 4. Set up git remote
  try {
    execSync(`git remote remove airmanager 2>/dev/null || true`, { stdio: "pipe" });
  } catch {}
  execSync(`git remote add airmanager "${authUrl}"`, { stdio: "inherit" });
  console.log("Remote added.");

  // 5. Push main branch
  console.log("Pushing main branch...");
  execSync(`git push airmanager main --force`, { stdio: "inherit" });
  console.log("✓ main branch pushed to GitHub.");

  return { username, token };
}

run().catch(e => {
  console.error("Error:", e.message);
  process.exit(1);
});
