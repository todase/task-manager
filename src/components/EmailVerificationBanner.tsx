"use client"

import { useState } from "react"

interface Props {
  email: string | null | undefined
  emailVerified: Date | null | undefined
}

export function EmailVerificationBanner({ email, emailVerified }: Props) {
  const [hidden, setHidden] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  if (emailVerified || hidden) return null

  async function handleResend() {
    setSending(true)
    await fetch("/api/resend-verification", { method: "POST" })
    setSending(false)
    setSent(true)
  }

  return (
    <div className="bg-orange-50 border-b border-orange-200 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-orange-900">
        <span>⚠️</span>
        <span>
          Подтвердите ваш email <strong>{email}</strong>. Проверьте почту или{" "}
          {sent ? (
            <span className="text-orange-700 font-medium">письмо отправлено!</span>
          ) : (
            <button
              onClick={handleResend}
              disabled={sending}
              className="text-indigo-600 underline disabled:opacity-50 cursor-pointer"
            >
              {sending ? "Отправляем..." : "отправьте повторно"}
            </button>
          )}
        </span>
      </div>
      <button
        onClick={() => setHidden(true)}
        className="text-orange-300 hover:text-orange-500 ml-4 text-lg leading-none"
        aria-label="Закрыть"
      >
        ✕
      </button>
    </div>
  )
}
