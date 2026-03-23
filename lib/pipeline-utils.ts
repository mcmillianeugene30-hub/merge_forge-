export function inferLanguageFromPath(p: string): string {
  if (/\.tsx?$/.test(p)) return 'typescript';
  if (/\.jsx?$/.test(p)) return 'javascript';
  if (/\.sql$/.test(p)) return 'sql';
  if (/\.json$/.test(p)) return 'json';
  if (/\.md$/.test(p)) return 'markdown';
  if (/\.css$/.test(p)) return 'css';
  if (/\.(toml|ya?ml)$/.test(p)) return 'yaml';
  if (/^\.env/.test(p)) return 'env';
  return 'text';
}

export function stripCodeFences(content: string): string {
  return content.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
}

export function detectArtifactType(p: string): string {
  if (p.endsWith('.sql')) return 'schema';
  if (/^\.env/.test(p)) return 'env';
  if (/README/i.test(p)) return 'readme';
  if (p.startsWith('plans/')) return 'plan';
  return 'code';
}

export function buildAppContext(plan: any): string {
  const parts = [
    `App: ${plan.appName}`,
    `Stack: ${(plan.stack ?? []).join(', ')}`,
    `Files: ${plan.files?.length ?? 0}`,
  ];
  return parts.join(' | ').slice(0, 500);
}

export function getRelevantFilesForCodegen(
  targetPath: string,
  targetImports: string[],
  generatedFiles: Array<{ path: string; content: string }>
): Array<{ path: string; content: string }> {
  const imported = targetImports
    .map(imp => {
      const normalized = imp.replace(/^@\//, '').replace(/^@\//, '');
      return generatedFiles.find(f => {
        const nf = f.path.replace(/\.test\.(ts|tsx)$/, '').replace(/\.ts[x]?$/, '');
        const ni = normalized.replace(/\.test\.(ts|tsx)$/, '').replace(/\.ts[x]?$/, '');
        return nf === ni || f.path.includes(ni);
      });
    })
    .filter(Boolean) as Array<{ path: string; content: string }>;

  const alwaysInclude = ['lib/utils.ts', 'lib/types.ts']
    .map(p => generatedFiles.find(f => f.path.endsWith(p)))
    .filter(Boolean) as Array<{ path: string; content: string }>;

  const combined = [...imported, ...alwaysInclude];
  const seen = new Set<string>();
  return combined.filter(f => {
    if (seen.has(f.path)) return false;
    seen.add(f.path);
    return true;
  }).slice(0, 5);
}

export function slugifyName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
