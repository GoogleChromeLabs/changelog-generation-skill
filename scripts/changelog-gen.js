/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const fs = require('fs');

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  let text = await response.text();
  // Strip Gitiles security prefix if present
  if (text.startsWith(")]}'")) {
    text = text.substring(4);
  }
  return JSON.parse(text);
}

async function getChromiumCommits(milestone, prevMilestone, subproject) {
  console.error(`Fetching milestones...`);
  const milestones = await fetchJson('https://chromiumdash.appspot.com/fetch_milestones');

  const mData = milestones.find(m => m.milestone === milestone);
  const pmData = milestones.find(m => m.milestone === prevMilestone);

  if (!mData) throw new Error(`Milestone ${milestone} not found.`);
  if (!pmData) throw new Error(`Previous milestone ${prevMilestone} not found.`);

  const posStart = pmData.chromium_main_branch_position;
  const posEnd = mData.chromium_main_branch_position;

  console.error(`Resolving positions to hashes: ${posStart} -> ${posEnd}`);

  async function getHash(pos) {
    const data = await fetchJson(`https://cr-rev.appspot.com/_ah/api/crrev/v1/redirect/${pos}`);
    return data.git_sha;
  }

  const hashStart = await getHash(posStart);
  const hashEnd = await getHash(posEnd);

  // Get timestamps for the range
  async function getCommitDate(hash) {
    const log = await fetchJson(`https://chromium.googlesource.com/chromium/src/+log/${hash}?n=1&format=JSON`);
    return new Date(log.log[0].author.time).toISOString().replace('T', ' ').split('.')[0];
  }
  const dateStart = await getCommitDate(hashStart);
  const dateEnd = await getCommitDate(hashEnd);

  const path = SUBPROJECT_MAP.get(subproject) || subproject;
  console.error(`Searching Gerrit for path (${path}) and keyword (${subproject})...`);
  const query = `project:chromium/src branch:main (message:${subproject} OR dir:${path}) after:"${dateStart}" before:"${dateEnd}" status:merged`;
  const searchUrl = `https://chromium-review.googlesource.com/changes/?q=${encodeURIComponent(query)}&o=CURRENT_REVISION`;
  
  let searchData = [];
  try {
    searchData = await fetchJson(searchUrl);
  } catch (e) {
    console.error(`Gerrit search failed: ${e.message}`);
  }

  // Map Gerrit results to our commit format
  const finalCommitsMap = new Map();
  const searchCommits = searchData.map(c => ({
    commit: c.current_revision,
    message: c.subject,
    review_number: c._number,
    is_from_search: true
  })).filter(c => c.commit);

  for (const sc of searchCommits) {
    // Fetch full commit message for Gerrit results as search returns truncated subjects
    console.error(`Fetching full message for: ${sc.commit}`);
    try {
      const fullLog = await fetchJson(`https://chromium.googlesource.com/chromium/src/+log/${sc.commit}?n=1&format=JSON`);
      const fullCommit = fullLog.log[0];
      fullCommit.review_number = sc.review_number;
      finalCommitsMap.set(sc.commit, fullCommit);
    } catch (e) {
      console.error(`Failed to fetch full commit for ${sc.commit}: ${e.message}`);
    }
  }

  const finalCommits = Array.from(finalCommitsMap.values());

  // Ensure all commits have landed versions
  console.error(`Ensuring all ${finalCommits.length} commits have landed versions...`);
  for (const commit of finalCommits) {
    try {
      const dashUrl = `https://chromiumdash.appspot.com/fetch_commit?commit=${commit.commit}`;
      const dashData = await fetchJson(dashUrl);
      if (dashData && dashData.first_landed) {
        commit.first_landed = dashData.first_landed;
      }
    } catch (e) {
      // Ignore errors
    }
  }

  return finalCommits;
}

async function getGitHubCommits(repo, base, head) {
  console.error(`Fetching GitHub comparison: ${repo} ${base}...${head}`);
  // Note: This requires a public repo or GITHUB_TOKEN if private.
  const url = `https://api.github.com/repos/${repo}/compare/${base}...${head}`;
  const data = await fetchJson(url);
  return data.commits.map(c => ({
    commit: c.sha,
    message: c.commit.message,
    author: c.commit.author.name,
    time: c.commit.author.date
  }));
}

const SUBPROJECT_MAP = new Map([
  ['chromedriver', 'chrome/test/chromedriver'],
  ['chrome-headless-shell', 'headless'],
  ['chrome-headless', 'chrome/browser/headless'],
]);

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0]; // 'chromium' or 'github'

  try {
    if (mode === 'chromium') {
      const milestone = parseInt(args[1]);
      const subproject = args[2] || 'chromedriver';
      const prevMilestone = milestone - 1;

      const commits = await getChromiumCommits(milestone, prevMilestone, subproject);
      console.log(JSON.stringify(commits, null, 2));
    } else if (mode === 'github') {
      const repo = args[1];
      const base = args[2];
      const head = args[3];
      const commits = await getGitHubCommits(repo, base, head);
      console.log(JSON.stringify(commits, null, 2));
    } else {
      console.error("Usage: node changelog-gen.js chromium <milestone> [subproject]");
      console.error("Usage: node changelog-gen.js github <repo> <base> <head>");
      process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();