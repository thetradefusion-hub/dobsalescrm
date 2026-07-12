import { NextResponse, after } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { sendTemplateMessage } from '@/lib/whatsapp/meta-api'
import { decrypt } from '@/lib/whatsapp/encryption'
import {
  sanitizePhoneForMeta,
  isValidE164,
  phoneVariants,
  isRecipientNotAllowedError,
} from '@/lib/whatsapp/phone-utils'
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { persistBroadcastMessageToInbox } from '@/lib/broadcasts/persist-inbox'
import {
  resolveRealApiCap,
  resolveWhatsAppSimulation,
  simulateDeliveryReceipts,
  WHATSAPP_REAL_CAP_COOKIE,
  WHATSAPP_SIMULATION_COOKIE,
} from '@/lib/whatsapp/simulation'

interface BroadcastResult {
  phone: string
  status: 'sent' | 'failed'
  whatsapp_message_id?: string
  error?: string
  inbox_error?: string
  /** True when this recipient was faked (not sent via Meta). */
  simulated?: boolean
}

interface NewRecipient {
  phone: string
  contact_id?: string
  params?: string[]
  /** Pre-rendered template body for inbox history. */
  body_text?: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const jar = await cookies()
    const fullSimulation = resolveWhatsAppSimulation(
      jar.get(WHATSAPP_SIMULATION_COOKIE)?.value,
    )
    const settingsRealCap = resolveRealApiCap(
      jar.get(WHATSAPP_REAL_CAP_COOKIE)?.value,
    )

    const body = await request.json()
    const {
      recipients: newRecipients,
      phone_numbers,
      template_name,
      template_language,
      template_params,
      header_media,
      template_body,
      real_quota_remaining,
    } = body

    // Per-batch remaining real slots from the client send loop.
    // Full simulation → 0. Cap unset → unlimited. Else use remaining.
    let realQuotaLeft: number | null
    if (fullSimulation) {
      realQuotaLeft = 0
    } else if (
      typeof real_quota_remaining === 'number' &&
      Number.isFinite(real_quota_remaining)
    ) {
      realQuotaLeft = Math.max(0, Math.floor(real_quota_remaining))
    } else if (settingsRealCap !== null) {
      realQuotaLeft = settingsRealCap
    } else {
      realQuotaLeft = null // unlimited real Meta sends
    }

    const mayUseRealApi = realQuotaLeft === null || realQuotaLeft > 0

    // Rate-limit only when this batch might hit Meta.
    if (mayUseRealApi) {
      const limit = checkRateLimit(`broadcast:${user.id}`, RATE_LIMITS.broadcast)
      if (!limit.success) {
        return rateLimitResponse(limit)
      }
    }

    let recipients: NewRecipient[]
    if (Array.isArray(newRecipients) && newRecipients.length > 0) {
      recipients = newRecipients
    } else if (Array.isArray(phone_numbers) && phone_numbers.length > 0) {
      const shared: string[] = Array.isArray(template_params)
        ? template_params
        : []
      recipients = phone_numbers.map((phone: string) => ({
        phone,
        params: shared,
      }))
    } else {
      return NextResponse.json(
        {
          error:
            'Provide either `recipients` (preferred) or `phone_numbers` — must be a non-empty array',
        },
        { status: 400 },
      )
    }

    if (!template_name) {
      return NextResponse.json(
        { error: 'template_name is required' },
        { status: 400 },
      )
    }

    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (mayUseRealApi && (configError || !config)) {
      return NextResponse.json(
        {
          error:
            'WhatsApp not configured. Please set up your WhatsApp integration first.',
        },
        { status: 400 },
      )
    }

    const accessToken = config?.access_token
      ? decrypt(config.access_token)
      : 'simulation-token'
    const phoneNumberId = config?.phone_number_id ?? 'simulation-phone-id'
    const admin = supabaseAdmin()
    const mediaUrl =
      header_media?.type && header_media?.link
        ? String(header_media.link)
        : null

    const results: BroadcastResult[] = []
    let sentCount = 0
    let failedCount = 0
    let realSent = 0
    let simulatedSent = 0
    const simulatedMessageIds: string[] = []

    for (const recipient of recipients) {
      const sanitized = sanitizePhoneForMeta(recipient.phone)

      if (!isValidE164(sanitized)) {
        results.push({
          phone: recipient.phone,
          status: 'failed',
          error: 'Invalid phone number format',
        })
        failedCount++
        continue
      }

      const useSimulate =
        fullSimulation ||
        (realQuotaLeft !== null && realQuotaLeft <= 0)

      const variants = phoneVariants(sanitized)
      let sentMessageId: string | null = null
      let lastError: string | null = null

      for (const variant of variants) {
        try {
          const result = await sendTemplateMessage({
            phoneNumberId,
            accessToken,
            to: variant,
            templateName: template_name,
            language: template_language || 'en_US',
            params: recipient.params ?? [],
            simulate: useSimulate,
            headerMedia:
              header_media?.type && header_media?.link
                ? {
                    type: header_media.type,
                    link: header_media.link,
                    filename: header_media.filename,
                  }
                : undefined,
          })
          sentMessageId = result.messageId
          lastError = null
          break
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          if (!isRecipientNotAllowedError(errorMessage)) {
            lastError = errorMessage
            break
          }
          lastError = errorMessage
        }
      }

      if (sentMessageId) {
        const row: BroadcastResult = {
          phone: recipient.phone,
          status: 'sent',
          whatsapp_message_id: sentMessageId,
          simulated: useSimulate,
        }

        // Resolve contact_id if not provided (phone lookup).
        let contactId = recipient.contact_id ?? null
        if (!contactId) {
          const { data: contacts } = await admin
            .from('contacts')
            .select('id, phone')
            .eq('user_id', user.id)
          const match = (contacts ?? []).find((c) => {
            const p = sanitizePhoneForMeta(c.phone || '')
            return (
              p === sanitized ||
              phoneVariants(sanitized).includes(p) ||
              c.phone === recipient.phone
            )
          })
          contactId = match?.id ?? null
        }

        if (contactId) {
          const bodyText =
            recipient.body_text ??
            (typeof template_body === 'string' ? template_body : '') ??
            ''
          const persisted = await persistBroadcastMessageToInbox({
            admin,
            userId: user.id,
            contactId,
            templateName: template_name,
            bodyText,
            mediaUrl,
            whatsappMessageId: sentMessageId,
          })
          if ('error' in persisted) {
            console.error(
              '[broadcast] inbox persist failed:',
              persisted.error,
              recipient.phone,
            )
            row.inbox_error = persisted.error
          }
        } else {
          row.inbox_error = 'contact not found for inbox persist'
        }

        results.push(row)
        sentCount++
        if (useSimulate) {
          simulatedSent++
          simulatedMessageIds.push(sentMessageId)
        } else {
          realSent++
          if (realQuotaLeft !== null) realQuotaLeft -= 1
        }
      } else {
        console.error(
          `Failed to send broadcast to ${recipient.phone}:`,
          lastError,
        )
        results.push({
          phone: recipient.phone,
          status: 'failed',
          error: lastError || 'Unknown error',
          simulated: useSimulate,
        })
        failedCount++
      }
    }

    // Fake delivery ladder only for simulated recipients.
    if (simulatedMessageIds.length > 0) {
      const ids = [...simulatedMessageIds]
      after(() => simulateDeliveryReceipts(admin, ids))
    }

    return NextResponse.json({
      success: true,
      simulation: fullSimulation,
      real_sent: realSent,
      simulated_sent: simulatedSent,
      real_quota_remaining: realQuotaLeft,
      total: recipients.length,
      sent: sentCount,
      failed: failedCount,
      results,
    })
  } catch (error) {
    console.error('Error in WhatsApp broadcast POST:', error)
    return NextResponse.json(
      { error: 'Failed to process broadcast' },
      { status: 500 },
    )
  }
}
