# Planning
- ** Always Check for relevant skills ** before development of any feature or bug fix

# Commit, Changelog & Release Rules

## Commit Policy — Never Commit Without Permission

**Do not run `git commit` unless the user explicitly requests it** using instructions such as "commit", "make a commit", "commit this", or "version this".

- Finishing a feature, passing tests, having a clean diff, or an empty working tree is **never** a reason to commit automatically.
- Never run `git commit --amend`, rebase, reset, force-push, or push unless the user explicitly requests that specific action.
- When asked to commit, stage only files belonging to the requested task. Do not include unrelated deletions or tooling artifacts (e.g., `.freebuff/project-id`), local databases, `.env*` files, or AI scratch files.
- Prefer explicit paths (`git add <file> ...`) over `git add -A` to prevent unrelated files from being staged.
- A commit request does not automatically authorize a version bump. Versioning and releasing follow the separate workflow below.

## Deleting and Staging Changes

- **Delete what got replaced.** When a feature is removed or superseded, remove its old pages, routes, helpers, and leftover references too. Do not leave compatibility redirects, dead components, or unused code behind unless the user explicitly asks for them.
- **Stage only the part you are working on.** Some files mix two features (for example `prisma/schema.prisma`). Stage just the lines or hunks that belong to the requested task, and leave the rest of the file for later.
- **Never commit half a feature.** If the change needs a schema update, migration, shared helper, or route, commit them together with the feature code so the commit is complete and runnable on its own.
- **Search before committing.** `grep` the changelog (and the code, if relevant) for the names of removed features, routes, or modes. If anything still mentions them, clean it up before committing.

## Branch Workflow

Two long-lived branches, plus one short-lived branch per piece of work.

| Branch | Purpose | Rules |
| --- | --- | --- |
| `main` | What users get / production | Only merges from `dev`, release commits and tags. Never edit files or commit feature work here. |
| `dev` | Integration and staging | Features land here first. Pushes to `dev` produce preview deployments that act as the test environment. |
| `feat/<name>`, `fix/<name>` | One feature or fix each | Cut from `dev`, pushed early, squash-merged back into `dev`, then deleted. |

There is no separate `testing` branch. `dev` plus per-branch preview deployments is the test environment.

### Starting Work

- Never start editing while `main` is checked out. Switch to `dev` first, pull, then create a branch.
- One branch = one feature. Do not pile unrelated features onto the same branch, even if they were written in the same session.
- Before switching branches, deal with the working tree: commit the work, or stash it explicitly. Never carry a dirty tree across branches.
- If a feature needs a database change, that branch owns its migration and runs `prisma migrate dev` against a scratch database before merging.

### Merging

- Open a pull request into `dev` and wait for CI (lint, typecheck, test, build) to pass.
- Squash-merge so `dev` gets one commit per feature, then delete the branch.
- Merge `dev` into `main` with `--no-ff` at release time, so `main` shows one readable merge point per release.
- Never force-push or rewrite shared history.

### Repository Settings

- The GitHub default branch must be `main`, so clones and pull requests start from the branch that ships. After changing it, run `git remote set-head origin -a` locally.
- Every release is tagged `vX.Y.Z`. Tags are part of the release, not an optional extra.

## Changelog Policy — Always Maintain `[Unreleased]`

**Every independently meaningful feature, fix, improvement, or other change must be documented in the existing `## [Unreleased]` section of `CHANGELOG.md` as part of implementing that change.**

This is mandatory. Do not wait until the end of a development session, commit, or release to document changes.

The changelog must accurately represent the meaningful changes that will be included in the next release, not every intermediate implementation state.

### Rules

- Record each independently meaningful feature or change as soon as it is implemented and verified.
- Each distinct feature, fix, or improvement must have its own meaningful changelog entry. Do not combine unrelated changes into vague summary bullets.
- Before creating a new entry, review existing entries under `[Unreleased]` to determine whether the change belongs to an already documented feature or improvement.
- If a subsequent change modifies, refines, replaces, or reverses an existing documented change, update the existing entry instead of creating a duplicate.
- Do not document intermediate implementation states that are no longer part of the resulting changes.
- Keep separate entries when changes represent genuinely independent features, fixes, or improvements, even when they affect the same component or files.
- If a documented feature is completely removed or reverted before release, remove its changelog entry if it no longer represents a change included in the release.
- Preserve the original entry's meaningful context when updating it. Do not unnecessarily discard information about functionality that remains implemented.
- Never combine unrelated changes merely because they were implemented during the same session.
- Always update the existing `[Unreleased]` section. Never create duplicate `[Unreleased]` headings.
- Do not create a versioned changelog heading or bump `package.json` unless the user explicitly requests versioning or a release.

Use the existing categories:

- `### Added`
- `### Changed`
- `### Fixed`
- `### Removed`
- `### Technical`

Create a category only if it does not already exist.

Keep the `### Technical` section accurate, including:

- `Modified:` key modified files.
- `New:` newly created files.
- `Deleted:` removed files.
- `Tests:` actual test and verification results.

### Avoiding Duplicate and Superseded Entries

Changelog entries must describe the resulting implementation, not every iteration made during development.

Treat multiple iterations of the same logical change as one changelog entry unless they introduce independently meaningful functionality.

**Example 1 — A change is replaced:**

Feature 1:
- Change the navbar color to red.

Changelog entry:
- Changed navbar color to red.

Feature 2:
- Change the navbar color from red to blue.

Correct final `[Unreleased]` entry:
- Changed navbar color to blue.

Do not retain both entries because red is no longer the resulting implementation.

**Example 2 — An existing feature is refined:**

Feature 1:
- Add a responsive navigation menu.

Feature 2:
- Improve its mobile transition and interaction behavior.

Correct final `[Unreleased]` entry:
- Added a responsive navigation menu with improved mobile interactions and transitions.

Update the existing entry rather than documenting the refinement as an unrelated feature.

**Example 3 — Independent changes affect the same component:**

Feature 1:
- Add a responsive navigation menu.

Feature 2:
- Add keyboard navigation and accessibility support.

Correct final `[Unreleased]` entries:

- Added a responsive navigation menu.
- Added keyboard navigation and accessibility support to the navigation system.

Keep both because they represent independently meaningful improvements.

**Example 4 — A feature is completely reverted:**

Feature 1:
- Add a new dashboard widget.

Feature 2:
- Remove the dashboard widget and restore the previous dashboard layout.

Correct final `[Unreleased]` result:

- Remove the original feature entry if the widget is no longer part of the release.

Do not report functionality that will not exist in the resulting release.

### Changelog Maintenance Principle

Before adding an entry, always ask:

1. Is this a genuinely new and independently meaningful change?
2. Does an existing entry already describe the affected feature?
3. Does this change replace, refine, or reverse an existing entry?
4. Does the existing entry still accurately describe the resulting implementation?

**The changelog is a record of meaningful changes included in the eventual release, not a development diary.**

Intermediate work and implementation history belong in `.agents/RECENT_CHANGES.md`.

### Changelog Completion Requirement

Before considering a feature or task complete:

- Verify that every independently meaningful change has an appropriate entry under `[Unreleased]`.
- Verify that existing entries have been updated when subsequent changes supersede them.
- Remove duplicate, outdated, or misleading descriptions.
- Confirm that the changelog accurately reflects the resulting implementation.

Documentation is part of implementation, not an optional final step.

## Release / Versioning Workflow

**Only execute this workflow when the user explicitly requests a version bump or release.**

A plain commit request does not trigger this workflow.

### 1. Review All Changes

Read `.agents/RECENT_CHANGES.md` to understand changes accumulated since the previous release.

Also review:

- The current Git status and diff.
- The existing `CHANGELOG.md` and its `[Unreleased]` section.
- Relevant changes that may not yet have been recorded.

Do not rely exclusively on the scratch file. Cross-check it against the actual repository changes.

### 2. Audit the `[Unreleased]` Section

Before versioning, ensure **every independently meaningful feature, fix, improvement, and other change since the previous release is accurately documented**.

- Compare `.agents/RECENT_CHANGES.md` against `CHANGELOG.md`.
- Check the actual Git diff for undocumented changes.
- Add any missing entries under the appropriate categories.
- Update existing entries when subsequent changes refine, replace, or reverse previously documented functionality.
- Remove duplicate, superseded, obsolete, or misleading entries.
- Ensure entries accurately describe the resulting implemented behavior.
- Verify that no unfinished or planned functionality is documented as completed.

**Do not proceed to the version bump until this audit is complete.**

### 3. Determine the Version Bump

Follow semantic versioning:

- **Patch (`x.x.X`):** Bug fixes, minor corrections, and small improvements.
- **Minor (`x.X.0`):** New features, UI overhauls, and removed subsystems.
- **Major (`X.0.0`):** Breaking API, database schema, or compatibility changes.

Choose the appropriate bump based on the cumulative changes since the previous release, not just the most recent feature.

### 4. Finalize `CHANGELOG.md`

Once every change has been documented under `[Unreleased]`, move its contents into a new versioned entry.

Follow the existing changelog format:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- ...

### Changed
- ...

### Removed
- ...

### Fixed
- ...

### Technical
- Modified: <key files>
- New: <new files>
- Deleted: <deleted files>
- Tests: <actual test results>
```

- Place the new version entry directly below the `[Unreleased]` heading.
- Leave an empty `## [Unreleased]` section above the new release.
- Preserve the existing changelog structure and formatting.
- Do not omit changes simply because they seem small or technical.
- Ensure that the release notes describe the final changes, not intermediate iterations or superseded behavior.

### 5. Update `package.json`

Update the project version to match the new changelog release version.

Ensure the version numbers are consistent across relevant project metadata files, if applicable.

### 6. Verify Before Committing

Run the required checks:

```bash
npm run lint
npm run test
```

- Verify that both commands pass.
- Never claim a check passed without actually running it.
- Never weaken, remove, or skip failing tests just to produce a successful release.
- If a check fails, report the failure and do not proceed with the release commit until resolved.

### 7. Create the Final Release Commit

Only after all changes have been documented, audited, versioned, and verified should the final release commit be created.

Stage only the relevant project files using explicit paths.

Example:

```bash
git add package.json CHANGELOG.md <other-relevant-files>
git commit -m "chore: release vX.Y.Z"
```

Use conventional commit prefixes where appropriate:

- `feat:` — New functionality.
- `fix:` — Bug fixes.
- `chore:` — Maintenance and release commits.
- `refactor:` — Code restructuring.
- `docs:` — Documentation.
- `test:` — Tests.

**The release commit is the final step of the versioning workflow. Do not create an intermediate commit just to record the changelog or version bump.**

### Release Workflow Summary

The required sequence is:

1. Review all accumulated changes.
2. Audit every feature and change against `[Unreleased]`.
3. Consolidate entries that describe the same logical change.
4. Update superseded entries and remove obsolete or reverted changes.
5. Add any missing entries.
6. Determine the appropriate semantic version bump.
7. Move `[Unreleased]` entries into the versioned release section.
8. Update `package.json`.
9. Run lint and tests.
10. Stage the relevant files.
11. Create one final release commit.

Do not skip or reorder these steps.

## `.agents/RECENT_CHANGES.md` — How to Maintain It

This file is an AI-maintained scratchpad for tracking work across sessions.

- Keep it at `.agents/RECENT_CHANGES.md`.
- Ensure it remains Git-ignored under the `# AI assistant artifacts` section in `.gitignore`.
- Never include it in commits.
- Update it continuously as changes are implemented, including intermediate changes, refinements, reversions, and superseded implementations.
- Organize entries into numbered feature/fix sections with descriptive headings.
- Record enough detail to identify what changed, why it changed, and which files were affected.
- Keep it synchronized with the actual implementation.
- Preserve enough development history to make subsequent changelog consolidation and release audits reliable.

### Relationship Between `RECENT_CHANGES.md` and `CHANGELOG.md`

These files serve different purposes:

**`.agents/RECENT_CHANGES.md` — Development history**

- Tracks implementation details and changes across sessions.
- May retain intermediate states, iterations, and superseded approaches.
- Helps identify what happened during development.
- Acts as a reference during release auditing.

**`CHANGELOG.md` — Release history**

- Tracks meaningful changes intended for release.
- Must reflect the resulting implementation.
- Must consolidate multiple iterations of the same logical change.
- Must exclude reverted or superseded functionality.
- Must remain accurate and understandable to project users.

Do not blindly copy scratchpad entries into the changelog. Review and consolidate them first.

### After a Successful Release Commit

- Reset or truncate the file.
- Retain only changes made after the release commit.
- Do not discard uncommitted work or changes that were not included in the release.

## General Rules

- Always run `npm run lint` and `npm run test` and verify they pass before committing.
- Never commit `.env` files, `*.db` files, or AI scratch files.
- Never report checks as passing without actually executing them.
- Never weaken or skip failing tests to obtain a green result.
- Keep changelog entries accurate, concise, and understandable.
- Do not document planned or unfinished functionality as completed.
- Do not silently discard unrelated user changes.
- Preserve existing Git history unless explicitly instructed otherwise.
- Do not automatically commit, version, release, or push changes without the user's explicit authorization.

## Core Principle

**Implement → Document → Verify.**

Every independently meaningful feature or change must have its own entry under `[Unreleased]` immediately after implementation.

When an existing change is subsequently refined or superseded, update its entry instead of accumulating duplicate descriptions.

When the user requests a release, audit all entries, consolidate the final changes, bump the version, finalize the changelog, verify the project, and create one final release commit.
