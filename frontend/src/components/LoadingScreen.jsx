export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        {/* Logo */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center glow">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          {/* Spinning ring */}
          <div className="absolute inset-0 rounded-2xl border-2 border-brand-500/30 animate-spin" style={{animationDuration:'3s'}} />
        </div>
        <div className="text-center">
          <p className="text-white/60 text-sm">Loading InsightFlow...</p>
        </div>
      </div>
    </div>
  )
}
