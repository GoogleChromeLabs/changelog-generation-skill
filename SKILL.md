---
name: changelog-generation
description: Generate human-readable changelogs for Chromium milestones or GitHub repositories. Use this when the user asks for a summary of changes, bug fixes, or a changelog for projects like chromedriver, headless, or any GitHub repo given a version/milestone.
---

# Changelog Generation

This skill helps you generate summarized, human-readable changelogs by fetching raw commit data and using your reasoning to categorize and summarize it.

## Workflows

### 1. Generating Chromium Changelogs
When a user asks for a changelog for a Chromium project (e.g., "chromedriver M149" or "headless M130"):
1.  **Identify the milestone** (e.g., 149) and the **subproject** (e.g., `chromedriver`).
2.  **Run the generator script**:
    ```bash
    node scripts/changelog-gen.js chromium <milestone> <subproject>
    ```
    *Supported subprojects*: `chromedriver`, `chrome-headless-shell`, `chrome-headless`. You can also pass a raw Chromium path if known.
3.  **Process the Output**: The script returns a JSON array of commits.
4.  **Summarize**:
    *   Group changes into "New Features", "Bug Fixes", and "Other Changes".
    *   Look for `Bug: <id>` or `Fixed: <id>` in the commit messages to identify fixes.
    *   Ignore "reland", "revert", or "cleanup" commits unless they contain significant information.
    *   Provide a concise, bulleted list.

### 2. Generating GitHub Changelogs
When a user asks for a changelog for a GitHub repository (e.g., "changelog for google/zx from v7.0.0 to v8.0.0"):
1.  **Identify the repo** (owner/repo), **base tag**, and **head tag**.
2.  **Run the generator script**:
    ```bash
    node scripts/changelog-gen.js github <owner/repo> <base_tag> <head_tag>
    ```
3.  **Process and Summarize**:
    *   Similar to Chromium, but use standard GitHub conventional commit patterns (if present) to categorize.

## Summarization Guidelines
*   **Deep Analysis**: Read the **full commit message** (including the body) from the JSON output to genuinely understand what the commit does and its impact. Do not rely solely on the first line (the commit title), as it is often misleading or too technical.
*   **Relevance Classification**: Evaluate each commit to determine if it is genuinely relevant to the requested subproject (e.g., `chromedriver` or `headless`).
    *   *Relevant*: Modifies the tool's core functionality, fixes a bug specific to the tool, or has a commit message prefix for the tool (e.g., `[chromedriver]`).
    *   *Internal/Refactor*: Codebase-wide refactorings (e.g., IWYU fixes, renaming variables, C++ feature updates, widespread spanification, updating `constexpr`, mechanical namespace changes, OWNER adjustments) that happen to touch the tool's directory, or commits that merely mention the tool in passing.
*   **Categorization**: Group *Relevant* changes into "New Features", "Bug Fixes", and "Other Changes". Group all *Internal/Refactor* changes into a separate "Internal changes and refactors" section. Sort most complex, most lines of code, or bigger features and bugfixes first.
*   **Grouping and Consolidation**: Identify commits that are part of the same logical change (e.g., multiple commits for a single feature or related fixes for the same component). Combine these into a single, cohesive bullet point that describes the overall impact. This is more human-readable than listing every individual commit.
*   **Rewrite for the User**: Rewrite the commit message (or group of messages) into a clear, understandable, 1-sentence bullet point describing the impact for the end-user. 
    *   *Example:* Instead of *"Wait until a Tab can complete an MPArch activation"*, write *"Improved tab handling to wait for complete MPArch activation during navigation."*
    *   *Example:* Instead of *"Fix the crash due to improper truncation..."*, write *"Fixed a crash that occurred when log strings were improperly truncated."*
*   **Be Concise**: Use one bullet point per logical change. If multiple commits are combined, include all relevant PR/commit links and bug IDs in the same bullet point.
*   **Include Links**: 
    *   **Chromium**: Link each change to its Gerrit CL using markdown inline links: `[crrev.com/c/<review_number>](https://crrev.com/c/<review_number>)`. Use the `review_number` field from the JSON output if available. Fallback to `[<short_hash>](https://crrev.com/<commit_hash>)` only if `review_number` is missing.
    *   **GitHub**: Look for PR numbers (e.g., `(#123)`) in the commit message. Link the PR using clean markdown: `([#<pr_number>](https://github.com/<owner>/<repo>/pull/<pr_number>))`. Do not include the commit hash if a PR is present. If no PR is found, fallback to linking the short hash (7 chars): `([<short_hash>](https://github.com/<owner>/<repo>/commit/<sha>))`.
    *   If the commit message has a link to a bug tracker, include it as well (e.g., `[Bug: 12345](https://crbug.com/12345)`).
*   **Tone**: Professional and helpful.
*   **Version Superscript**: Determine the first version/milestone the commit landed in. **Omit the superscript entirely** if it matches the main release version you are generating the changelog for. Only append it as an HTML superscript at the end of the bullet point if the change landed in a *different* (e.g., earlier minor/patch) version (e.g., `... ([#123](url)).<sup>134.0.6998.0</sup>`).
*   **Code Block Output**: MUST wrap the entire final changelog in a ` ```markdown ` code block. This prevents the terminal from expanding the markdown links (e.g., changing `[text](url)` to `text (url)`), allowing the user to copy-paste the raw, concise markdown directly.

## Example Output Format
```markdown
### New Features
- **[Component]**: Brief description of a single-commit feature ([crrev.com/c/12345](https://crrev.com/c/12345)).
- **[Component]**: Combined description of a feature implemented across multiple commits ([#14826](https://github.com/puppeteer/puppeteer/pull/14826), [#14827](https://github.com/puppeteer/puppeteer/pull/14827)).<sup>v22.1.0-alpha</sup>

### Bug Fixes
- **[Component]**: Fixed an issue where... ([crrev.com/c/67890](https://crrev.com/c/67890), [Bug: 1234](https://crbug.com/1234)).
- **[Component]**: Addressed several issues related to X ([#123](https://github.com/owner/repo/pull/123), [#124](https://github.com/owner/repo/pull/124)).
```
