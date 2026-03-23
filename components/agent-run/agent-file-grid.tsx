"use client";
import { useState, useEffect } from "react";
import { AgentFile } from "@/lib/types";

interface Props {
  runId: string;
  initialFiles?: AgentFile[];
}

const STATUS_COLORS: Record<string, string> = {
  done: 'bg-green-500',
  fixed: 'bg-green-400',
  lint_fixed: 'bg-emerald-500',
  test_written: 'bg-blue-500',
  pending: 'bg-yellow-500',
  generating: 'bg-orange-500',
  error: 'bg-red-500',
};

export function AgentFileGrid({ runId, initialFiles = [] }: Props) {
  const [files, setFiles] = useState<AgentFile[]>(initialFiles);

  useEffect(() => {
    const es = new EventSource(`/api/forge/${window?.location?.pathname?.split('/')[2]}/agent-run?runId=${runId}`);
    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.filePath) {
          setFiles(prev => {
            const idx = prev.findIndex(f => f.path === data.filePath);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], content: data.fileContent } as AgentFile;
              return updated;
            }
            return [...prev, { path: data.filePath, content: data.fileContent } as AgentFile];
          });
        }
      } catch {}
    };
    return () => es.close();
  }, [runId]);

  const sections = {
    source: files.filter(f => f.file_type === 'source'),
    test: files.filter(f => f.file_type === 'test'),
    config: files.filter(f => f.file_type === 'config' || f.file_type === 'schema'),
  };

  return (
    <div className="space-y-4">
      {Object.entries(sections).map(([section, sectionFiles]) => (
        sectionFiles.length > 0 && (
          <div key={section}>
            <h4 className="text-sm font-medium mb-2 capitalize">{section} files</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {sectionFiles.map(f => (
                <div key={f.path} className="text-xs p-2 rounded border bg-muted/50 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[f.status] ?? 'bg-gray-500'}`} />
                  <span className="truncate font-mono">{f.path.split('/').pop()}</span>
                  {f.test_status && (
                    <span className={`text-[10px] ${
                      f.test_status === 'passing' ? 'text-green-500' :
                      f.test_status === 'failing' ? 'text-red-500' : 'text-yellow-500'
                    }`}>
                      {f.test_status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      ))}
    </div>
  );
}
