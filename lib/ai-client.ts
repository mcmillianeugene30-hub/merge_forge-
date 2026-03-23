import { AIProvider, AIProviderConfig } from '@/lib/types';
import { AI_PROVIDERS } from '@/lib/constants';

type AIMessage = { role: 'system' | 'user' | 'content'; content: string };

type AICallOptions = {
  role: 'architect' | 'codegen' | 'reviewer' | 'mechanic' | 'test';
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  preferredProvider?: AIProvider;
};

type AICallResult = {
  content: string;
  provider: AIProvider;
  model: string;
};

export async function callAI(options: AICallOptions): Promise<AICallResult> {
  const { role, systemPrompt, userPrompt, maxTokens, temperature, jsonMode, preferredProvider } = options;

  const availableProviders = AI_PROVIDERS.filter(p => {
    const key = process.env[p.apiKeyEnv];
    return key && key.trim().length > 0;
  });

  if (availableProviders.length === 0) {
    throw new Error('No AI provider configured. Set at least one of: GROQ_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY in .env.local');
  }

  let providers = [...availableProviders];
  if (preferredProvider) {
    const preferred = providers.findIndex(p => p.name === preferredProvider);
    if (preferred > 0) {
      providers.splice(preferred, 1);
      providers.unshift(availableProviders.find(p => p.name === preferredProvider)!);
    }
  }

  for (const provider of providers) {
    const model = provider.models[role] ?? provider.models.codegen ?? Object.values(provider.models)[0];
    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens ?? 4096,
      temperature: temperature ?? 0.2,
      messages,
    };

    if (jsonMode && provider.supportsJsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env[provider.apiKeyEnv]}`,
    };

    if (provider.name === 'openrouter') {
      headers['HTTP-Referer'] = 'https://mergeforge.app';
      headers['X-Title'] = 'MergeForge';
    }

    try {
      const res = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        console.warn(`[ai-client] ${provider.name} rate limited, trying next provider`);
        continue;
      }

      if (!res.ok) {
        const err = await res.text();
        console.error(`[ai-client] ${provider.name} error ${res.status}:`, err);
        continue;
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        console.warn(`[ai-client] ${provider.name} returned empty content`);
        continue;
      }

      return { content, provider: provider.name, model };
    } catch (err) {
      console.error(`[ai-client] ${provider.name} fetch error:`, err);
      continue;
    }
  }

  throw new Error('All AI providers failed or unavailable');
}

export async function callAIJSON<T>(options: AICallOptions & { jsonMode?: boolean }): Promise<T & { _provider: AIProvider }> {
  const { jsonMode, ...rest } = options;
  const useJsonMode = jsonMode ?? true;

  const providers = AI_PROVIDERS.filter(p => {
    const key = process.env[p.apiKeyEnv];
    return key && key.trim().length > 0;
  });

  let systemPrompt = rest.systemPrompt;
  if (useJsonMode) {
    const jsonProvider = providers.find(p => p.supportsJsonMode);
    if (!jsonProvider) {
      systemPrompt += '\n\nYou MUST respond with ONLY valid JSON. No markdown. No code fences. No explanation. Start your response with { and end with }.';
    }
  }

  const result = await callAI({ ...rest, systemPrompt, jsonMode: useJsonMode });

  let content = result.content;
  const match = content.match(/```(?:json|typescript)?\n?([\s\S]*?)\n?```$/);
  if (match) content = match[1];
  content = content.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();

  try {
    const parsed = JSON.parse(content);
    return { ...parsed, _provider: result.provider } as T & { _provider: AIProvider };
  } catch (err) {
    throw new Error(`JSON parse failed: ${err}\nRaw content:\n${content.slice(0, 500)}`);
  }
}

export async function callAIStream(
  options: AICallOptions,
  onChunk: (chunk: string, provider: AIProvider) => void
): Promise<AICallResult> {
  const groqProvider = AI_PROVIDERS.find(p => p.name === 'groq' && process.env[p.apiKeyEnv]);
  if (!groqProvider) {
    const result = await callAI(options);
    onChunk(result.content, result.provider);
    return result;
  }

  const model = groqProvider.models[options.role] ?? groqProvider.models.codegen ?? Object.values(groqProvider.models)[0];
  const body = {
    model,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.2,
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userPrompt },
    ],
    stream: true,
  };

  const res = await fetch(`${groqProvider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env[groqProvider.apiKeyEnv]}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const result = await callAI(options);
    onChunk(result.content, result.provider);
    return result;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    const result = await callAI(options);
    onChunk(result.content, result.provider);
    return result;
  }

  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            onChunk(delta, 'groq');
          }
        } catch {}
      }
    }
  }

  return { content: fullContent, provider: 'groq', model };
}

export { AI_PROVIDERS };
