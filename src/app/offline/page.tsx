"use client"

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">📡</div>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">Нет подключения</h1>
        <p className="text-sm text-gray-500 mb-6">
          Откройте приложение онлайн хотя бы раз, чтобы данные закэшировались и были доступны офлайн.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  )
}
