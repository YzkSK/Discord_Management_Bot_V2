# GitHub Issue Workflow

Each phase uses Issues as the work queue.

## Branches

- `main`: stable branch, protected, no direct pushes.
- `phase/<number>-<name>`: phase integration branch.
- `feature/issue-<number>-<short-name>`: one implementation issue.
- `fix/issue-<number>-<short-name>`: one fix issue during a phase.
- `hotfix/issue-<number>-<short-name>`: urgent fix from `main`.

Branches are not deleted after merge.

## Flow

1. Create or select an Issue.
2. Create a branch from the current phase branch.
3. Keep the PR focused on that Issue.
4. Open the PR against the current phase branch.
5. Reference the Issue in the PR body.
6. Squash merge by default after CI passes.
7. Leave the branch in place after merge.

Phase completion is a final PR from the phase branch into `main`.

GitHub only auto-closes issues from PRs merged into the default branch. For PRs merged into phase branches, close child issues manually after merge with a verification comment.

## Merge Policy

Use Squash merge by default so integration branch history reads as Issue/PR-sized changes. Use a regular merge only when the internal commit history is meaningful enough to keep in the integration branch.

Do not use Rebase merge during Phase work unless the workflow is intentionally changed.

## Protection Rules

Protect both `main` and active `phase/*` branches:

- Require pull request before merging.
- Require status checks to pass.
- Require branches to be up to date before merging.
- Block force pushes.
- Block deletion.

## Local Branch Commands

```bash
git switch main
git switch -c phase/0-foundation
git switch -c feature/issue-2-repo-bootstrap
```
