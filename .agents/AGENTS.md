# KaiwaAI — Agent Rules

## Commit Policy — never commit on your own

**Do not run `git commit` unless the user explicitly asked for it in their message** ("commit", "make a commit", "commit this", "version this").

- Finishing a feature, passing tests, a clean diff, or an empty working tree is **never** a reason to commit.
- Never `git commit --amend`, rebase, reset, force-push, or push unless the user asks for that exact action.
- When asked to commit, stage only the files belonging to that task. Do **not** include unrelated deletions or tooling artifacts (e.g. `.freebuff/project-id`), local databases, `.env*`, or AI scratch files.
- Prefer explicit paths (`git add <file> …`) over `git add -A` so stray files cannot slip in.

## Changelog Policy — `[Unreleased]` by default

Every user-visible change is recorded in the **existing `## [Unreleased]`** section of `CHANGELOG.md` as part of making the change — not only when committing.

- Add bullets under the matching heading (`### Added`, `### Changed`, `### Fixed`, `### Removed`, `### Technical`). Merge into the headings already there; do not open a second `[Unreleased]` section.
- Do **not** create a new `## [X.Y.Z] - YYYY-MM-DD` heading and do **not** bump `package.json` unless the user explicitly asks to version or release.
- Keep the `### Technical` block accurate: `Modified:`, `New:`, `Deleted:`, and the real test/check results.

## Release / Versioning Workflow

Only run this when the user explicitly asks to **version** or **release** (not for a plain commit):

### 1. Read `.agents/RECENT_CHANGES.md`
This file is maintained as a scratch pad by the AI across sessions. Read it to understand everything that changed since the last commit.

### 2. Bump `package.json` version (semver)
- **Patch** (`x.x.X`): bug fixes, lint fixes, minor tweaks only
- **Minor** (`x.X.0`): new features, UI overhauls, removed subsystems ← most common
- **Major** (`X.0.0`): breaking schema/API changes

### 3. Move the `[Unreleased]` content into a new entry in `CHANGELOG.md`
Follow the existing format strictly:
```
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
- Tests: <test count> passing — lint/typecheck clean
```
Leave an empty `## [Unreleased]` above it. Source all details from `.agents/RECENT_CHANGES.md` and the existing Unreleased section.

### 4. Ensure `.agents/RECENT_CHANGES.md` is git-ignored
It is listed in `.gitignore` under `# AI assistant artifacts`. Do NOT commit it.

### 5. Stage and commit
```
git add <explicit task paths>
git commit -m "feat: <short summary> (v<X.Y.Z>)"
```
Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `refactor:`.

---

## `.agents/RECENT_CHANGES.md` — How to Maintain It

- Keep it at `.agents/RECENT_CHANGES.md` (git-ignored).
- Update it continuously as changes are made across sessions.
- Organise by numbered feature/fix sections with headings.
- After a commit, truncate / reset the file so it only covers *post-commit* changes going forward.

---

## General Rules

- Always run `npm run lint` and `npm run test` and verify they pass before committing.
- Never commit `.env`, `*.db`, or AI scratch files.
- Never report a check as passing without running it, and never weaken or skip a failing test to get a green commit.
- Conventional commit messages: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
