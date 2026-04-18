"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <div className="flex flex-col gap-4 w-80 text-center">
        <h1 className="text-2xl font-bold">Ссылка недействительна</h1>
        <p className="text-gray-500">Запросите новую ссылку для сброса пароля.</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4 w-80 text-center">
        <h1 className="text-2xl font-bold">Пароль изменён</h1>
        <p className="text-gray-500">Теперь вы можете войти с новым паролем.</p>
        <button
          onClick={() => router.push("/login")}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Войти
        </button>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (password !== confirm) {
      setError("Пароли не совпадают")
      return
    }
    if (password.length < 8) {
      setError("Пароль должен содержать минимум 8 символов")
      return
    }
    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Ссылка недействительна или устарела")
      return
    }
    setDone(true)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-80">
      <h1 className="text-2xl font-bold">Новый пароль</h1>
      <p className="text-sm text-gray-500">Минимум 8 символов.</p>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <input
        type="password"
        placeholder="Новый пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2 rounded"
        required
      />
      <input
        type="password"
        placeholder="Повторите пароль"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="border p-2 rounded"
        required
      />
      <button type="submit" className="bg-blue-500 text-white p-2 rounded">
        Сохранить пароль
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </main>
  )
}
