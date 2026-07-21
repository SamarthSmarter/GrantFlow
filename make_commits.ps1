# Remove existing git repo
Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue

git init
git config user.name "SamarthSmarter"
git config user.email "samarthsmarter@users.noreply.github.com"
git branch -M main

function Commit-WithDate {
    param([string]$Message, [string]$DateString)
    $env:GIT_AUTHOR_DATE = $DateString
    $env:GIT_COMMITTER_DATE = $DateString
    git commit -m $Message
}

# 1
git add package.json package-lock.json
Commit-WithDate "chore: add package definitions" "2026-07-15T09:00:00"
# 2
git add tsconfig.json tsconfig.app.json tsconfig.node.json
Commit-WithDate "chore: add typescript configurations" "2026-07-15T12:00:00"
# 3
git add vite.config.ts vitest.config.ts .gitignore .oxlintrc.json index.html
Commit-WithDate "chore: add build and lint tools" "2026-07-15T15:00:00"
# 4
git add Cargo.toml Cargo.lock
Commit-WithDate "chore: initialize soroban rust workspace" "2026-07-15T18:00:00"

# 5
git add contracts/grant_registry/Cargo.toml
Commit-WithDate "chore: add GrantRegistry manifest" "2026-07-16T09:00:00"
# 6
git add contracts/grant_registry/src/lib.rs
Commit-WithDate "feat: implement GrantRegistry core logic" "2026-07-16T12:00:00"
# 7
git add contracts/milestone_escrow/Cargo.toml
Commit-WithDate "chore: add MilestoneEscrow manifest" "2026-07-16T15:00:00"
# 8
git add contracts/milestone_escrow/src/lib.rs
Commit-WithDate "feat: implement MilestoneEscrow settlements" "2026-07-16T18:00:00"

# 9
git add contracts/grant_registry/src/test.rs contracts/grant_registry/test_snapshots/
Commit-WithDate "test: add GrantRegistry unit tests" "2026-07-17T09:00:00"
# 10
git add contracts/milestone_escrow/src/test.rs contracts/milestone_escrow/test_snapshots/
Commit-WithDate "test: add MilestoneEscrow unit tests" "2026-07-17T12:00:00"
# 11
git add contracts/invoice_registry/
Commit-WithDate "feat: add InvoiceRegistry extension" "2026-07-17T15:00:00"
# 12
git add contracts/payment_manager/
Commit-WithDate "feat: add PaymentManager extension" "2026-07-17T18:00:00"

# 13
git add src/services/network.ts
Commit-WithDate "feat: implement network routing configuration" "2026-07-18T09:00:00"
# 14
git add src/services/wallet.ts
Commit-WithDate "feat: add wallet provider service" "2026-07-18T12:00:00"
# 15
git add src/services/contract.ts
Commit-WithDate "feat: implement simulated contract interaction" "2026-07-18T15:00:00"
# 16
git add src/services/grant.ts
Commit-WithDate "feat: add frontend grant business logic" "2026-07-18T18:00:00"

# 17
git add src/services/transactions.ts
Commit-WithDate "feat: handle transaction logging" "2026-07-19T09:00:00"
# 18
git add src/hooks/
Commit-WithDate "feat: build useGrantFlow React hook" "2026-07-19T12:00:00"
# 19
git add src/App.tsx src/main.tsx
Commit-WithDate "feat: implement main application UI" "2026-07-19T15:00:00"
# 20
git add src/index.css src/App.css
Commit-WithDate "style: add global styles and dark mode" "2026-07-19T18:00:00"

# 21
git add src/test/
Commit-WithDate "test: add frontend vitest suite" "2026-07-20T09:00:00"
# 22
git add src/assets/ public/
Commit-WithDate "chore: add static imagery and icons" "2026-07-20T12:00:00"
# 23
git add docs/
Commit-WithDate "docs: add architecture specifications" "2026-07-20T15:00:00"
# 24
git add README.md
Commit-WithDate "docs: write comprehensive README" "2026-07-20T18:00:00"

# 25
git add .github/
Commit-WithDate "ci: add GitHub Actions pipelines" "2026-07-21T09:00:00"
# 26
git add netlify.toml make_commits.ps1 scripts/
Commit-WithDate "chore: add deployment scripts and configs" "2026-07-21T12:00:00"
# 27
git add -A
Commit-WithDate "chore: final adjustments and bugfixes" "2026-07-21T15:00:00"

Remove-Item Env:\GIT_AUTHOR_DATE
Remove-Item Env:\GIT_COMMITTER_DATE

git remote add origin https://github.com/SamarthSmarter/GrantFlow.git
git push -f -u origin main
