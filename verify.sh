#!/bin/bash

cd ~/mergeforge

echo "========================================"
echo "MergeForge Phase 1 Verification"
echo "========================================"
echo ""

PASS=0
FAIL=0

check_file() {
  if [ -f "$1" ]; then
    echo "✅ $1"
    ((PASS++))
  else
    echo "❌ $1 - MISSING"
    ((FAIL++))
  fi
}

# Core config files
echo "--- Core Config Files ---"
check_file "package.json"
check_file "tsconfig.json"
check_file "next.config.ts"
check_file "tailwind.config.ts"
check_file "components.json"
echo ""

# Lib files
echo "--- Lib Files ---"
check_file "lib/utils.ts"
check_file "lib/types.ts"
check_file "lib/constants.ts"
check_file "lib/auth.ts"
check_file "lib/github.ts"
check_file "lib/board.ts"
echo ""

# Supabase lib
echo "--- Supabase Lib ---"
check_file "lib/supabase/client.ts"
check_file "lib/supabase/server.ts"
check_file "lib/supabase/admin.ts"
check_file "lib/supabase/middleware.ts"
check_file "middleware.ts"
echo ""

# Migrations
echo "--- Supabase Migrations ---"
check_file "supabase/migrations/202603190001_init_extensions.sql"
check_file "supabase/migrations/202603190002_profiles_and_forges.sql"
check_file "supabase/migrations/202603190003_github_integrations.sql"
check_file "supabase/migrations/202603190004_unified_work_items.sql"
check_file "supabase/migrations/202603190005_rls_policies.sql"
check_file "supabase/migrations/202603190006_realtime_publications.sql"
check_file "supabase/migrations/202603190007_user_trigger.sql"
check_file "supabase/seed.sql"
echo ""

# Edge Functions
echo "--- Edge Functions ---"
check_file "supabase/functions/sync-github/index.ts"
check_file "supabase/functions/suggest-merges/index.ts"
echo ""

# App files
echo "--- App Files ---"
check_file "app/layout.tsx"
check_file "app/page.tsx"
check_file "app/globals.css"
check_file "app/dashboard/page.tsx"
echo ""

# Auth
echo "--- Auth ---"
check_file "app/auth/callback/route.ts"
check_file "app/auth/error/page.tsx"
check_file "app/(auth)/login/page.tsx"
check_file "app/(auth)/signup/page.tsx"
check_file "app/(auth)/onboarding/page.tsx"
echo ""

# API routes
echo "--- API Routes ---"
check_file "app/api/forges/route.ts"
check_file "app/api/github/auth/route.ts"
check_file "app/api/github/callback/route.ts"
check_file "app/api/github/repos/route.ts"
check_file "app/api/github/disconnect/route.ts"
echo ""

# Forge pages
echo "--- Forge Pages ---"
check_file "app/forge/[id]/page.tsx"
check_file "app/forge/[id]/loading.tsx"
check_file "app/forge/[id]/not-found.tsx"
echo ""

# Settings
echo "--- Settings ---"
check_file "app/settings/page.tsx"
echo ""

# Components
echo "--- Components ---"
check_file "components/create-forge-dialog.tsx"
check_file "components/app-sidebar.tsx"
check_file "components/user-nav.tsx"
check_file "components/empty-state.tsx"
check_file "components/forge/forge-header.tsx"
check_file "components/forge/overview-stats.tsx"
check_file "components/forge/activity-feed-preview.tsx"
check_file "components/forge/repo-health-card.tsx"
echo ""

# Providers
echo "--- Providers ---"
check_file "components/providers/theme-provider.tsx"
check_file "components/providers/query-provider.tsx"
check_file "components/providers/supabase-provider.tsx"
echo ""

# UI Components
echo "--- UI Components ---"
check_file "components/ui/button.tsx"
check_file "components/ui/badge.tsx"
check_file "components/ui/card.tsx"
check_file "components/ui/input.tsx"
check_file "components/ui/textarea.tsx"
check_file "components/ui/dialog.tsx"
check_file "components/ui/tabs.tsx"
check_file "components/ui/avatar.tsx"
check_file "components/ui/dropdown-menu.tsx"
echo ""

# Hooks
echo "--- Hooks ---"
check_file "lib/hooks/use-forges.ts"
check_file "lib/hooks/use-forge.ts"
check_file "lib/hooks/use-forge-realtime.ts"
echo ""

echo "========================================"
echo "Audit Checks"
echo "========================================"
echo ""

# Audit: PUBLISHABLE_KEY should not exist
PUBLISH_COUNT=$(grep -r "PUBLISHABLE_KEY" lib/ app/ 2>/dev/null | wc -l)
if [ "$PUBLISH_COUNT" -eq 0 ]; then
  echo "✅ PUBLISHABLE_KEY audit: PASS (no incorrect key references)"
  ((PASS++))
else
  echo "❌ PUBLISHABLE_KEY audit: FAIL (found $PUBLISH_COUNT occurrences)"
  grep -r "PUBLISHABLE_KEY" lib/ app/ 2>/dev/null
  ((FAIL++))
fi

# Audit: ANON_KEY should be used
ANON_COUNT=$(grep -r "ANON_KEY" lib/supabase/ 2>/dev/null | wc -l)
if [ "$ANON_COUNT" -gt 0 ]; then
  echo "✅ ANON_KEY audit: PASS (found $ANON_COUNT references)"
  ((PASS++))
else
  echo "❌ ANON_KEY audit: FAIL (no references found)"
  ((FAIL++))
fi

# Audit: No module-level supabaseAdmin singleton
ADMIN_CHECK=$(grep "supabaseAdmin" lib/supabase/admin.ts 2>/dev/null | grep -v "getSupabaseAdmin" | wc -l)
if [ "$ADMIN_CHECK" -eq 0 ]; then
  echo "✅ admin.ts singleton audit: PASS (no module-level export)"
  ((PASS++))
else
  echo "❌ admin.ts singleton audit: FAIL (found module-level export)"
  ((FAIL++))
fi

# Audit: dashboard/create-forge path should not exist
DASH_CHECK=$(grep -r "dashboard/create-forge" components/ 2>/dev/null | wc -l)
if [ "$DASH_CHECK" -eq 0 ]; then
  echo "✅ dashboard/create-forge audit: PASS (not referenced)"
  ((PASS++))
else
  echo "❌ dashboard/create-forge audit: FAIL (found in components)"
  ((FAIL++))
fi

# Audit: /api/forges should be used in create dialog
FORGES_CHECK=$(grep "/api/forges" components/create-forge-dialog.tsx 2>/dev/null | wc -l)
if [ "$FORGES_CHECK" -gt 0 ]; then
  echo "✅ /api/forges in dialog: PASS (found)"
  ((PASS++))
else
  echo "❌ /api/forges in dialog: FAIL (not found)"
  ((FAIL++))
fi

# Audit: sync-github not a stub
SYNC_CHECK=$(grep -i "TODO\|stub\|wire.*here" supabase/functions/sync-github/index.ts 2>/dev/null | wc -l)
if [ "$SYNC_CHECK" -eq 0 ]; then
  echo "✅ sync-github stub audit: PASS (not a stub)"
  ((PASS++))
else
  echo "❌ sync-github stub audit: FAIL (appears to be a stub)"
  ((FAIL++))
fi

# Audit: suggest-merges calls an API
SUGGEST_CHECK=$(grep -E "api.openai.com|api.groq.com" supabase/functions/suggest-merges/index.ts 2>/dev/null | wc -l)
if [ "$SUGGEST_CHECK" -gt 0 ]; then
  echo "✅ suggest-merges API call audit: PASS (calls AI API)"
  ((PASS++))
else
  echo "❌ suggest-merges API call audit: FAIL (no API call found)"
  ((FAIL++))
fi

echo ""
echo "========================================"
echo "Summary"
echo "========================================"
echo "Files present: $PASS"
echo "Issues found: $FAIL"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo "✅ All checks passed!"
  exit 0
else
  echo "❌ Some checks failed. Review above."
  exit 1
fi
