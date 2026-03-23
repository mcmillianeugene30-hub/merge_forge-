#!/bin/bash
cd ~/mergeforge
echo "========================================"
echo "MergeForge Phase 5 v2 Verification"
echo "========================================"
pass=0; fail=0
check() { if [ $1 -eq 0 ]; then echo "  [PASS] $2"; ((pass++)); else echo "  [FAIL] $2"; ((fail++)); fi; }

echo ""
echo "--- File Presence ---"
for f in \
  "lib/agent-prompts.ts" \
  "lib/pipeline-utils.ts" \
  "lib/agents/architect.ts" \
  "lib/agents/codegen.ts" \
  "lib/agents/reviewer.ts" \
  "lib/agents/ts-mechanic.ts" \
  "lib/agents/lint-mechanic.ts" \
  "lib/agents/test-writer.ts" \
  "lib/agents/test-runner.ts" \
  "lib/agents/deploy.ts" \
  "lib/agents/orchestrator.ts" \
  "lib/hooks/use-agent-run.ts" \
  "lib/hooks/use-agent-events-realtime.ts" \
  "app/api/forge/[id]/agent-run/route.ts" \
  "app/api/forge/[id]/agent-run/[runId]/route.ts" \
  "components/agent-run/agent-pipeline-launcher.tsx" \
  "components/agent-run/agent-progress-stream.tsx" \
  "components/agent-run/agent-file-grid.tsx" \
  "app/forge/[id]/builder/page.tsx" \
  "app/forge/[id]/builder/run/page.tsx"; do
  [ -f "$f" ] && check 0 "$f" || check 1 "$f"
done

echo ""
echo "--- Key Content ---"
grep -q "AI_PROVIDERS" lib/ai-client.ts && check 0 "ai-client AI_PROVIDERS" || check 1 "ai-client"
grep -q "OPENROUTER_API_KEY" lib/ai-client.ts && check 0 "OpenRouter key" || check 1 "OpenRouter"
grep -q "GEMINI_API_KEY" lib/ai-client.ts && check 0 "Gemini key" || check 1 "Gemini"
grep -q "generativelanguage" lib/constants.ts && check 0 "Gemini endpoint" || check 1 "Gemini endpoint"
grep -q "HTTP-Referer" lib/ai-client.ts && check 0 "OpenRouter headers" || check 1 "OpenRouter headers"
grep -q "No AI provider" lib/ai-client.ts && check 0 "No AI error" || check 1 "No AI error"
grep -q "MAX_FIX_ATTEMPTS" lib/agents/ts-mechanic.ts && check 0 "TS retry loop" || check 1 "TS retry"
grep -q "ESLint" lib/agents/lint-mechanic.ts && check 0 "ESLint mechanic" || check 1 "ESLint"
grep -q "execSync" lib/agents/test-runner.ts && check 0 "Test runner exec" || check 1 "Test runner"
grep -q "tmpdir" lib/agents/test-runner.ts && check 0 "Temp dir" || check 1 "Temp dir"
grep -q "runArchitectAgent" lib/agents/orchestrator.ts && check 0 "Architect agent" || check 1 "Architect"
grep -q "runDeployAgent" lib/agents/orchestrator.ts && check 0 "Deploy agent" || check 1 "Deploy"
grep -q "ReadableStream" "app/api/forge/[id]/agent-run/route.ts" && check 0 "SSE ReadableStream" || check 1 "SSE"
grep -q "X-Accel-Buffering" "app/api/forge/[id]/agent-run/route.ts" && check 0 "Nginx buffering" || check 1 "Nginx"
grep -q "EventSource" lib/hooks/use-agent-run.ts && check 0 "EventSource hook" || check 1 "EventSource"
grep -q "tests_written" supabase/migrations/202603200004_agent_pipeline.sql && check 0 "Pipeline stats" || check 1 "Pipeline stats"

echo ""
echo "========================================"
echo "Result: $pass passed, $fail failed"
echo "========================================"
[ $fail -eq 0 ] && echo "Phase 5 v2 complete" || echo "Fix failures"
exit $fail
