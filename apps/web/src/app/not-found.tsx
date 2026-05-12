import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-8xl mb-4">🍽️</div>
      <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-gray-500 mb-6">Esta página não existe ou foi removida.</p>
      <Link
        href="/menu"
        className="bg-amber-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-amber-600 transition"
      >
        Ir ao Cardápio
      </Link>
    </div>
  )
}
