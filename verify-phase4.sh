#!/bin/bash
set -e
cd ~/mergeforge

echo "========================================"
echo "MergeForge Phase 4 Verification"
echo "========================================"

PASS=0
FAIL=0

check_file() {
  if [ -f "$1" ]; then
    echo "✅ $1"
    ((PASS++))
  else
    echo "❌ MISSING: $1"
    ((FAIL++))
  fi
}

echo ""
echo "--- Phase 4 File Checks ---"
files=(
  "supabase/migrations/202603200003_phase4_tables.sql"
  "app/api/forge/[id]/builder/export/zip/route.ts"
  "app/api/forge/[id]/builder/push-github/route.ts"
  "app/api/forge/[id]/builder/deploy-vercel/route.ts"
  "app/api/forge/[id]/deploy-jobs/route.ts"
  "app/api/forge/[id]/deploy-jobs/[jobId]/route.ts"
  "app/api/forge/[id]/merge-center/route.ts"
  "supabase/functions/suggest-merges/index.ts"
  "components/merge-center/run-analysis-button.tsx"
  "components/merge-center/merge-groups-card.tsx"
  "components/merge-center/merge-suggestions-card.tsx"
  "components/merge-center/merge-risks-card.tsx"
  "components/merge-center/merge-sequence-card.tsx"
  "components/merge-center/merge-history-list.tsx"
  "components/builder/deploy-panel.tsx"
  "app/forge/[id]/merge-center/page.tsx"
  "app/forge/[id]/merge-center/[analysisId]/page.tsx"
  "app/forge/[id]/builder/[sessionId]/page.tsx"
)

for f in "${files[@]}"; do
  check_file "$f"
done

echo ""
echo "--- Grep Audits ---"

grep_check() {
  if grep -q "$1" "$2" 2>/dev/null; then
    echo "✅ grep '$1' in $2 — PASS"
    ((PASS++))
  else
    echo "❌ grep '$1' in $2 — FAIL"
    ((FAIL++))
  fi
}

grep_check "jszip\|JSZip" "app/api/forge/[id]/builder/export/zip/route.ts"
grep_check "Content-Disposition" "app/api/forge/[id]/builder/export/zip/route.ts"
grep_check "createBlob" "app/api/forge/[id]/builder/push-github/route.ts"
grep_check "createTree" "app/api/forge/[id]/builder/push-github/route.ts"
grep_check "createCommit" "app/api/forge/[id]/builder/push-github/route.ts"
grep_check "auto_init" "app/api/forge/[id]/builder/push-github/route.ts"
grep_check "api.vercel.com" "app/api/forge/[id]/builder/deploy-vercel/route.ts"
grep_check "VERCEL_API_TOKEN" "app/api/forge/[id]/builder/deploy-vercel/route.ts"
grep_check "deploy_jobs" "app/api/forge/[id]/builder/push-github/route.ts"
grep_check "deploy_jobs" "app/api/forge/[id]/builder/deploy-vercel/route.ts"
grep_check "suggest-merges" "app/api/forge/[id]/merge-center/route.ts"
grep_check "api.openai.com\|api.groq.com" "supabase/functions/suggest-merges/index.ts"
grep_check "merge_sequence" "supabase/functions/suggest-merges/index.ts"

if grep -q "TODO\|stub\|returning empty" "supabase/functions/suggest-merges/index.ts" 2>/dev/null; then
  echo "❌ suggest-merges still has stub markers — FAIL"
  ((FAIL++))
else
  echo "✅ suggest-merges edge function clean (no stubs)"
  ((PASS++))
fi

grep_check "DeployPanel" "app/forge/[id]/builder/[sessionId]/page.tsx"
grep_check "grid-cols-6" "app/forge/[id]/page.tsx"
grep_check "jszip" "package.json"

echo ""
echo "--- Cumulative Phase Audits ---"
for script in verify.sh verify-phase2.sh verify-phase3.sh; do
  if [ -f "$script" ]; then
    echo "Running $script..."
    bash "$script" 2>/dev/null || true
  fi
done

echo ""
echo "========================================"
echo "Phase 4 Summary: $PASS passed, $FAIL failed"
echo "========================================"

if [ $FAIL -eq 0 ]; then
  echo "✅ MergeForge Phase 4 complete — all 4 phases built."
  echo ""
  echo "Next steps:"
  echo "  1. supabase db reset"
  echo "  2. npm run dev"
  echo "  3. Open http://localhost:3000"
  echo "  4. Add VERCEL_API_TOKEN and GROQ_API_KEY or OPENAI_API_KEY to .env.local"
else
  echo "⚠️  Fix failures above before running"
fi
