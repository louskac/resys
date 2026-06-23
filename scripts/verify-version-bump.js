const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function getCommitRange() {
  try {
    // If running in an interactive terminal, don't read from stdin to avoid blocking
    if (process.stdin.isTTY) {
      return { localSha: "HEAD", remoteSha: "origin/main" };
    }
    // Read standard input from the git hook
    const input = fs.readFileSync(0, "utf-8").trim();
    if (!input) {
      return { localSha: "HEAD", remoteSha: "origin/main" };
    }
    const parts = input.split("\n")[0].split(" ");
    if (parts.length < 4) {
      return { localSha: "HEAD", remoteSha: "origin/main" };
    }
    const [localRef, localSha, remoteRef, remoteSha] = parts;
    return { localSha, remoteSha };
  } catch (err) {
    return { localSha: "HEAD", remoteSha: "origin/main" };
  }
}

function run() {
  console.log("\n=== System Release Validation Check ===");

  const { localSha, remoteSha } = getCommitRange();
  
  // If remoteSha is all zeros (empty), it means it's a new branch push
  const isNewBranch = !remoteSha || remoteSha.match(/^0+$/);
  let baseSha = isNewBranch ? "origin/main" : remoteSha;

  // Verify the base SHA actually exists in git history
  try {
    execSync(`git rev-parse ${baseSha}`, { stdio: "ignore" });
  } catch (err) {
    try {
      execSync(`git rev-parse HEAD~1`, { stdio: "ignore" });
      baseSha = "HEAD~1";
    } catch (e) {
      console.log("Initial repository push detected. Skipping version verification.");
      process.exit(0);
    }
  }

  // 1. Check if version was bumped in package.json
  let localVersion = "";
  let baseVersion = "";

  try {
    const localPkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf-8"));
    localVersion = localPkg.version || "";
  } catch (err) {
    console.error("[ERROR] Failed to read local package.json version.");
    process.exit(1);
  }

  try {
    const basePkgContent = execSync(`git show ${baseSha}:package.json`, { 
      encoding: "utf-8", 
      stdio: ["pipe", "pipe", "ignore"] 
    });
    const basePkg = JSON.parse(basePkgContent);
    baseVersion = basePkg.version || "";
  } catch (err) {
    baseVersion = "";
  }

  console.log(`Local Version:  ${localVersion}`);
  console.log(`Base Version:   ${baseVersion || "(None)"} (from ${baseSha})`);

  if (localVersion === baseVersion) {
    console.error(`\n[ERROR] Git push rejected: version in package.json has not changed!`);
    console.error(`Please update the "version" field in package.json to a new version (e.g. bump to "${localVersion.split('.').map((x,i)=>i===2?parseInt(x)+1:x).join('.')}") before pushing.`);
    process.exit(1);
  }

  // 2. Verify descriptive commit message in the push range
  try {
    const logRange = `${baseSha}..${localSha}`;
    const logOutput = execSync(`git log --format="%s" ${logRange}`, { encoding: "utf-8" }).trim();
    const commitMessages = logOutput.split("\n").filter(msg => msg.trim().length > 0);

    console.log(`\nVerifying pushed commit messages (${commitMessages.length}):`);
    commitMessages.forEach(msg => console.log(` - ${msg}`));

    // A message is descriptive if it contains words other than bump/release/version and is >= 8 chars
    const hasDescriptive = commitMessages.some(msg => {
      const trimmed = msg.trim().toLowerCase();
      if (trimmed.length < 8) return false;
      
      const words = trimmed.split(/\s+/).filter(w => 
        !['bump', 'version', 'to', 'release', 'update', 'updates'].includes(w) && 
        !w.match(/^v?\d+\.\d+\.\d+$/)
      );
      
      return words.length > 0;
    });

    if (!hasDescriptive) {
      console.error(`\n[ERROR] Git push rejected: no relevant update message found in commits.`);
      console.error(`At least one commit message in your push range must describe what was changed (not just version numbers or "bump" keywords).`);
      process.exit(1);
    }

    console.log(`\n[SUCCESS] Release validation passed. Proceeding with git push.\n`);
    process.exit(0);
  } catch (err) {
    console.error("[ERROR] Failed to verify commit messages.", err);
    process.exit(1);
  }
}

run();
