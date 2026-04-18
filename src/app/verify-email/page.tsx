import Link from "next/link"

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <VerifyEmailContent searchParams={searchParams} />
    </main>
  )
}

async function VerifyEmailContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  if (error === "expired") {
    return (
      <div className="flex flex-col gap-4 w-80 text-center">
        <h1 className="text-2xl font-bold">Ссылка устарела</h1>
        <p className="text-gray-500">
          Ссылка для подтверждения истекла. Войдите в аккаунт и запросите новое письмо.
        </p>
        <Link href="/login" className="text-blue-500 hover:underline">
          Войти
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 w-80 text-center">
      <h1 className="text-2xl font-bold">Ссылка недействительна</h1>
      <p className="text-gray-500">Ссылка для подтверждения недействительна.</p>
      <Link href="/login" className="text-blue-500 hover:underline">
        Войти
      </Link>
    </div>
  )
}
