import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const url = `${process.env.NEXTAUTH_URL}/api/verify-email?token=${token}`
  await resend.emails.send({
    from: "Task Manager <noreply@yourdomain.com>",
    to: email,
    subject: "Подтвердите ваш email",
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827">Подтвердите ваш email</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.5">Нажмите на кнопку ниже чтобы подтвердить адрес электронной почты. Ссылка действительна 24 часа.</p>
      <a href="${url}" style="background:#6366f1;color:white;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;display:inline-block">Подтвердить email</a>
      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af">Если вы не регистрировались — проигнорируйте это письмо.</p>
    </div>`,
  })
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const url = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`
  await resend.emails.send({
    from: "Task Manager <noreply@yourdomain.com>",
    to: email,
    subject: "Сброс пароля",
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827">Сброс пароля</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.5">Мы получили запрос на сброс пароля для вашего аккаунта. Ссылка действительна 1 час.</p>
      <a href="${url}" style="background:#6366f1;color:white;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;display:inline-block">Сбросить пароль</a>
      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af">Если вы не запрашивали сброс — проигнорируйте это письмо. Ваш пароль не изменится.</p>
    </div>`,
  })
}
