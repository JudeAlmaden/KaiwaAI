# KaiwaAI — Agent Rules

## Commit & Versioning Workflow

When the user asks to "make a commit", "version this", or "commit changes", always follow this exact sequence:

### 1. Read `documentation/RECENT_CHANGES.md`
This file is maintained as a scratch pad by the AI across sessions. Read it to understand everything that changed since the last commit.

### 2. Bump `package.json` version (semver)
- **Patch** (`x.x.X`): bug fixes, lint fixes, minor tweaks only
- **Minor** (`x.X.0`): new features, UI overhauls, removed subsystems ← most common
- **Major** (`X.0.0`): breaking schema/API changes

### 3. Prepend a new entry to `CHANGELOG.md`
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
Source all details from `documentation/RECENT_CHANGES.md`.

### 4. Ensure `documentation/RECENT_CHANGES.md` is git-ignored
It is listed in `.gitignore` under `# AI assistant artifacts`. Do NOT commit it.

### 5. Stage and commit
```
git add -A
git commit -m "feat: <short summary> (v<X.Y.Z>)"
```
Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `refactor:`.

---

## `documentation/RECENT_CHANGES.md` — How to Maintain It

- Keep it at `documentation/RECENT_CHANGES.md` (git-ignored).
- Update it continuously as changes are made across sessions.
- Organise by numbered feature/fix sections with headings.
- After a commit, truncate / reset the file so it only covers *post-commit* changes going forward.

---

## General Rules

- Always run `npm run lint` and `npm run test` and verify they pass before committing.
- Never commit `.env`, `*.db`, or AI scratch files.
- Conventional commit messages: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
