export default function Card({ children, className = '' }) {
  return (
    <section className={['rounded-2xl border border-gray-200 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)]', className].filter(Boolean).join(' ')}>
      {children}
    </section>
  )
}
