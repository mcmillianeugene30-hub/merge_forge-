#!/bin/bash

cd ~/mergeforge

echo "========================================"
echo "MergeForge Phase 2 Verification"
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

# Phase 2 files
echo "--- Phase 2 Files ---"
check_file "supabase/migrations/202603200001_board_fields.sql"
check_file "lib/board.ts"
check_file "lib/hooks/use-board-realtime.ts"
check_file "components/forge/board-card.tsx"
check_file "components/forge/board-column.tsx"
check_file "components/forge/board-view.tsx"
check_file "components/forge/create-issue-dialog.tsx"
check_file "components/forge/repo-picker.tsx"
check_file "components/forge/sync-button.tsx"
check_file "app/api/forge/[id]/issues/route.ts"
check_file "app/api/forge/[id]/issues/[issueId]/route.ts"
check_file "app/api/forge/[id]/sync/route.ts"
check_file "app/api/forge/[id]/repos/route.ts"
echo ""

# Updated forge page
check_file "app/forge/[id]/page.tsx"
echo ""

echo "========================================"
echo "Grep Audits"
echo "========================================"
echo ""

# Audit: hello-pangea should NOT exist
HELLO_COUNT=$(grep -r "hello-pangea" package.json 2>/dev/null | wc -l)
if [ "$HELLO_COUNT" -eq 0 ]; then
  echo "✅ hello-pangea removed: PASS"
  ((PASS++))
else
  echo "❌ hello-pangea still in package.json: FAIL"
  ((FAIL++))
fi

# Audit: dnd-kit should exist
DND_COUNT=$(grep -r "dnd-kit" package.json 2>/dev/null | wc -l)
if [ "$DND_COUNT" -gt 0 ]; then
  echo "✅ dnd-kit installed: PASS ($DND_COUNT references)"
  ((PASS++))
else
  echo "❌ dnd-kit not found in package.json: FAIL"
  ((FAIL++))
fi

# Audit: closestCorners in board-view
CLOSEST=$(grep "closestCorners" components/forge/board-view.tsx 2>/dev/null | wc -l)
if [ "$CLOSEST" -gt 0 ]; then
  echo "✅ closestCorners collision detection: PASS"
  ((PASS++))
else
  echo "❌ closestCorners not found: FAIL"
  ((FAIL++))
fi

# Audit: DndContext in board-view
DNDCONTEXT=$(grep "DndContext" components/forge/board-view.tsx 2>/dev/null | wc -l)
if [ "$DNDCONTEXT" -gt 0 ]; then
  echo "✅ DndContext usage: PASS"
  ((PASS++))
else
  echo "❌ DndContext not found: FAIL"
  ((FAIL++))
fi

# Audit: useSortable in board-card
SORTABLE=$(grep "useSortable" components/forge/board-card.tsx 2>/dev/null | wc -l)
if [ "$SORTABLE" -gt 0 ]; then
  echo "✅ useSortable: PASS"
  ((PASS++))
else
  echo "❌ useSortable not found: FAIL"
  ((FAIL++))
fi

# Audit: useDroppable in board-column
DROPPABLE=$(grep "useDroppable" components/forge/board-column.tsx 2>/dev/null | wc -l)
if [ "$DROPPABLE" -gt 0 ]; then
  echo "✅ useDroppable: PASS"
  ((PASS++))
else
  echo "❌ useDroppable not found: FAIL"
  ((FAIL++))
fi

# Audit: useBoardRealtime in board-view
REALTIME=$(grep "useBoardRealtime" components/forge/board-view.tsx 2>/dev/null | wc -l)
if [ "$REALTIME" -gt 0 ]; then
  echo "✅ useBoardRealtime: PASS"
  ((PASS++))
else
  echo "❌ useBoardRealtime not found: FAIL"
  ((FAIL++))
fi

# Audit: createInGithub in issues route
CREATEGH=$(grep "createInGithub" app/api/forge/\[id\]/issues/route.ts 2>/dev/null | wc -l)
if [ "$CREATEGH" -gt 0 ]; then
  echo "✅ createInGithub support: PASS"
  ((PASS++))
else
  echo "❌ createInGithub not found: FAIL"
  ((FAIL++))
fi

# Audit: paginate in sync route
PAGINATE=$(grep "paginate" app/api/forge/\[id\]/sync/route.ts 2>/dev/null | wc -l)
if [ "$PAGINATE" -gt 0 ]; then
  echo "✅ Octokit pagination: PASS"
  ((PASS++))
else
  echo "❌ paginate not found: FAIL"
  ((FAIL++))
fi

# Audit: onConflict in repos route
ONCONFLICT=$(grep "onConflict" app/api/forge/\[id\]/repos/route.ts 2>/dev/null | wc -l)
if [ "$ONCONFLICT" -gt 0 ]; then
  echo "✅ idempotent upsert (onConflict): PASS"
  ((PASS++))
else
  echo "❌ onConflict not found: FAIL"
  ((FAIL++))
fi

# Audit: forge_id=eq subscription filter
SUBSCRIBE=$(grep "forge_id=eq" lib/hooks/use-board-realtime.ts 2>/dev/null | wc -l)
if [ "$SUBSCRIBE" -gt 0 ]; then
  echo "✅ filtered realtime subscription: PASS"
  ((PASS++))
else
  echo "❌ forge_id=eq filter not found: FAIL"
  ((FAIL++))
fi

# Audit: position sorting in board.ts
POSITION=$(grep "position" lib/board.ts 2>/dev/null | wc -l)
if [ "$POSITION" -gt 0 ]; then
  echo "✅ position sorting: PASS"
  ((PASS++))
else
  echo "❌ position not found: FAIL"
  ((FAIL++))
fi

# Audit: no stubs in board-view
STUBS=$(grep -i "TODO\|placeholder\|coming soon" components/forge/board-view.tsx 2>/dev/null | grep -v "Coming" | wc -l)
if [ "$STUBS" -eq 0 ]; then
  echo "✅ no stubs in board-view: PASS"
  ((PASS++))
else
  echo "❌ stubs/placeholders found: FAIL"
  ((FAIL++))
fi

echo ""
echo "========================================"
echo "Package.json dnd-kit versions"
echo "========================================"
echo ""

DND_CORE=$(grep "@dnd-kit/core" package.json 2>/dev/null)
DND_SORTABLE=$(grep "@dnd-kit/sortable" package.json 2>/dev/null)
DND_UTILITIES=$(grep "@dnd-kit/utilities" package.json 2>/dev/null)

if [ -n "$DND_CORE" ]; then
  echo "✅ @dnd-kit/core: $DND_CORE"
  ((PASS++))
else
  echo "❌ @dnd-kit/core not found"
  ((FAIL++))
fi

if [ -n "$DND_SORTABLE" ]; then
  echo "✅ @dnd-kit/sortable: $DND_SORTABLE"
  ((PASS++))
else
  echo "❌ @dnd-kit/sortable not found"
  ((FAIL++))
fi

if [ -n "$DND_UTILITIES" ]; then
  echo "✅ @dnd-kit/utilities: $DND_UTILITIES"
  ((PASS++))
else
  echo "❌ @dnd-kit/utilities not found"
  ((FAIL++))
fi

echo ""
echo "========================================"
echo "Summary"
echo "========================================"
echo "Checks passed: $PASS"
echo "Checks failed: $FAIL"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo "✅ All Phase 2 checks passed!"
  exit 0
else
  echo "❌ Some Phase 2 checks failed. Review above."
  exit 1
fi
