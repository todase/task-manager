"use client"

import { useState } from "react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col gap-4 w-80 text-center">
          <h1 className="text-2xl font-bold">Письмо отправлено</h1>
          <p className="text-gray-500">
            Если аккаунт с этим email существует, мы отправили ссылку для сброса пароля.
          </p>
          <Link href="/login" className="text-blue-500 hover:underline">
            Вернуться ко входу
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-80">
        <h1 className="text-2xl font-bold">Сброс пароля</h1>
        <p className="text-sm text-gray-500">
          Введите email — пришлём ссылку для сброса пароля.
        </p>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          Отправить письмо
        </button>
        <Link href="/login" className="text-sm text-center text-blue-500 hover:underline">
          ← Вернуться ко входу
        </Link>
      </form>
    </main>
  )
}
