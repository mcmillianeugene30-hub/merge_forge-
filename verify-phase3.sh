#!/bin/bash
set -e
cd ~/mergeforge

echo "========================================"
echo "MergeForge Phase 3 Verification"
echo "========================================"

echo ""
echo "--- Phase 3 File Checks ---"

files=(
  "supabase/migrations/202603200002_builder_tables.sql"
  "lib/github-ingest.ts"
  "lib/builder.ts"
  "components/builder/builder-prompt-form.tsx"
  "components/builder/builder-session-list.tsx"
  "components/builder/repo-analysis-card.tsx"
  "components/builder/artifact-tree.tsx"
  "components/builder/artifact-viewer.tsx"
  "app/api/forge/[id]/builder/analyze/route.ts"
  "app/api/forge/[id]/builder/plan/route.ts"
  "app/api/forge/[id]/builder/generate/route.ts"
  "app/api/forge/[id]/builder/export/route.ts"
  "app/api/forge/[id]/merge/suggest/route.ts"
  "app/forge/[id]/builder/page.tsx"
  "app/forge/[id]/builder/[sessionId]/page.tsx"
  "app/forge/[id]/merge-center/page.tsx"
  "supabase/functions/plan-merged-app/index.ts"
  "supabase/functions/generate-app-artifacts/index.ts"
  "supabase/functions/analyze-repos/index.ts"
  "CHANGELOG.md"
)

pass=0
fail=0
for f in "${files[@]}"; do
  if [ -f "$f" ]; then
    echo "✅ $f"
    ((pass++))
  else
    echo "❌ MISSING: $f"
    ((fail++))
  fi
done

echo ""
echo "--- SQL Table Checks ---"
if grep -q "builder_sessions" supabase/migrations/202603200002_builder_tables.sql; then
  echo "✅ builder_sessions table"
else
  echo "❌ builder_sessions table"
fi

if grep -q "builder_artifacts" supabase/migrations/202603200002_builder_tables.sql; then
  echo "✅ builder_artifacts table"
else
  echo "❌ builder_artifacts table"
fi

if grep -q "repo_analysis_cache" supabase/migrations/202603200002_builder_tables.sql; then
  echo "✅ repo_analysis_cache table"
else
  echo "❌ repo_analysis_cache table"
fi

echo ""
echo "========================================"
echo "Summary"
echo "========================================"
echo "Files present: $pass"
echo "Files missing: $fail"
if [ $fail -eq 0 ]; then
  echo ""
  echo "✅ All Phase 3 files present!"
else
  echo ""
  echo "❌ Some files missing"
  exit 1
fi
