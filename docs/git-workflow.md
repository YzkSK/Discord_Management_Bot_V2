# GitHub Issue Workflow

Phase0 uses Issues as the work queue.

## Branches

- `main`: stable branch, protected, no direct pushes.
- `phase/0-foundation`: Phase0 integration branch.
- `feature/issue-<number>-<short-name>`: one implementation issue.
- `fix/issue-<number>-<short-name>`: one fix issue during a phase.
- `hotfix/issue-<number>-<short-name>`: urgent fix from `main`.

Branches are not deleted after merge.

## Flow

1. Create or select an Issue.
2. Create a branch from `phase/0-foundation`.
3. Keep the PR focused on that Issue.
4. Open the PR against `phase/0-foundation`.
5. Include `Closes #<issue-number>` in the PR body.
6. Squash merge by default after CI passes.
7. Leave the branch in place after merge.

Phase completion is a final PR from `phase/0-foundation` into `main`.

## Merge Policy

Use Squash merge by default so integration branch history reads as Issue/PR-sized changes. Use a regular merge only when the internal commit history is meaningful enough to keep in the integration branch.

Do not use Rebase merge during Phase0.

## Protection Rules

Protect both `main` and `phase/0-foundation`:

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
