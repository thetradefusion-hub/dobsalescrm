import { loadAiConfig } from '@/lib/ai/run-reply'
import type { ValidationIssue } from '@/lib/automations/validate'

export async function validateAiConfigured(userId: string): Promise<ValidationIssue[]> {
  const config = await loadAiConfig(userId)
  if (!config?.api_key_encrypted) {
    return [
      {
        path: 'ai',
        message:
          'Configure AI in Settings → AI (API key required) before using AI Reply steps or global auto-reply',
      },
    ]
  }
  return []
}
