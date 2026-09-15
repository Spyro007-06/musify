export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b0b0f] text-[#dce5d8] flex items-center justify-center relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#4cf479]/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#4720ca]/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Auth Content */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}
