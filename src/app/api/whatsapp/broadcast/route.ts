import { NextResponse } from 'next/server'
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

interface BroadcastResult {
  phone: string
  status: 'sent' | 'failed'
  whatsapp_message_id?: string
  error?: string
  inbox_error?: string
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

    const limit = checkRateLimit(`broadcast:${user.id}`, RATE_LIMITS.broadcast)
    if (!limit.success) {
      return rateLimitResponse(limit)
    }

    const body = await request.json()
    const {
      recipients: newRecipients,
      phone_numbers,
      template_name,
      template_language,
      template_params,
      header_media,
      template_body,
    } = body

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

    if (configError || !config) {
      return NextResponse.json(
        {
          error:
            'WhatsApp not configured. Please set up your WhatsApp integration first.',
        },
        { status: 400 },
      )
    }

    const accessToken = decrypt(config.access_token)
    const admin = supabaseAdmin()
    const mediaUrl =
      header_media?.type && header_media?.link
        ? String(header_media.link)
        : null

    const results: BroadcastResult[] = []
    let sentCount = 0
    let failedCount = 0

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

      const variants = phoneVariants(sanitized)
      let sentMessageId: string | null = null
      let lastError: string | null = null

      for (const variant of variants) {
        try {
          const result = await sendTemplateMessage({
            phoneNumberId: config.phone_number_id,
            accessToken,
            to: variant,
            templateName: template_name,
            language: template_language || 'en_US',
            params: recipient.params ?? [],
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
      } else {
        console.error(
          `Failed to send broadcast to ${recipient.phone}:`,
          lastError,
        )
        results.push({
          phone: recipient.phone,
          status: 'failed',
          error: lastError || 'Unknown error',
        })
        failedCount++
      }
    }

    return NextResponse.json({
      success: true,
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
