# Changelog Generation Skill

An [agent skill](https://agentskills.io/home#what-are-agent-skills) that provides a repeatable and automated way to generate human readable changelogs for any open source project release — including sub-projects in Chromium, and projects hosted in GitHub. The skill aims to provide a draft in Markdown format that is summarized and grouped (Feature vs. Bugfix, for example), and strives to minimize editorial work required on top of the generated draft.

## Features

- Classification of commit history into summarized changes, pruning of unrelated changes.
- Grouping of related commits into a single human friendly description.
- Annotation of changes that landed in minor or patch versions (common for Chromium based projects).
- Annotation with links to related CLs and PRs (for GitHub projects).
- Automatic sorting of large and complex changes towards the top of the list.
- Annotation with links to bugs being fixed (Buganizer or GitHub issue).
- Automatic classification of "potentially unrelated but worthy of review" into a separate category, for example identification of codebase-wide refactoring that might have affected the project, but are irrelevant to the changelog audience.

## Installation

You can install this skill directly from the latest GitHub release. The examples below assume the use of Gemini CLI.

```bash
gemini skills install https://github.com/GoogleChromeLabs/changelog-generation-skill --scope user
```

After installing, verify the skill and reload your Gemini CLI:

```bash
/skills reload
```

## Usage

Once installed, simply ask the agent to generate a changelog. For example:

**Chromium:**

> "Generate a changelog for chromedriver M149"
> "What are the changes in headless M130?"

**GitHub:**

> "Generate a changelog for google/zx from v7.0.0 to v8.0.0"
> "Produce a changelog for GoogleChrome/lighthouse v13.1.0"

## Development

This repository contains the raw source of the skill. To distribute it, the skill is automatically packaged using GitHub Actions.

- **Commits and Pull Requests:** Generates a `changelog-generation.skill` build artifact so you can test changes.
- **Tags:** Pushing a version tag (e.g., `git tag v1.0.0 && git push --tags`) automatically publishes a GitHub Release containing the packaged `.skill` artifact.

This is not an officially supported Google product. This project is not eligible for the [Google Open Source Software Vulnerability Rewards Program](https://bughunters.google.com/open-source-security).
