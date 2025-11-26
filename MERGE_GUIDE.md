# Merge Guide for This Project

This guide walks you through merging changes when you are not yet familiar with Git. The steps assume you have already cloned the repository and have installed Node.js and npm.

## 1) Update your local main branch
```bash
git checkout main
git pull origin main
```
If you see errors about unknown remotes, ask a teammate for the correct remote URL and add it with `git remote add origin <url>`.

## 2) Bring in the work branch
Replace `<branch>` with the branch that contains the changes you want to merge (for example, `work`).
```bash
git fetch origin <branch>
git checkout <branch>
```
Run `git status` to confirm you have a clean working tree.

## 3) Rebase or merge main into the work branch
Pull the latest `main` changes into the work branch to surface any conflicts before opening a PR.
```bash
git checkout <branch>
git pull --rebase origin main   # keeps history linear
# or, if you prefer a merge commit:
# git merge origin/main
```
If conflicts appear, open the reported files and look for `<<<<<<<`, `=======`, and `>>>>>>>` markers. Edit the files to keep the desired code, then mark them resolved:
```bash
git add <file1> <file2>
git rebase --continue            # if you are rebasing
```

## 4) Test locally
From the repository root, install dependencies and run the build:
```bash
npm install
npm run build
```
If the build fails because Google Fonts cannot be downloaded in your environment, note the warning but verify there are no TypeScript errors.

## 5) Commit your changes
If you had to resolve conflicts, commit the results:
```bash
git add .
git commit -m "Resolve merge conflicts"
```

## 6) Open a pull request
Push the work branch and open a PR against `main` in your Git hosting provider:
```bash
git push origin <branch>
```
In the PR description, summarize the changes, the conflict resolution (if any), and the tests you ran.

## 7) Merge the PR
Once CI passes and the PR is approved, use your hosting provider's UI to merge the PR (choose "Rebase and merge" if you rebased locally, otherwise "Create a merge commit").

## Quick checklist
- [ ] `main` is up to date locally
- [ ] Work branch rebased/merged with `main`
- [ ] Conflicts resolved and committed
- [ ] `npm run build` succeeds (font warnings are acceptable if offline)
- [ ] PR opened with a summary and test notes
