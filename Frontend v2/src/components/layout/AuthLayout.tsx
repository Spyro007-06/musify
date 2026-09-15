import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { motion } from 'framer-motion';

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();

  // If already authenticated, redirect to home
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background">
      {/* Animated Aurora Background */}
      <div className="absolute inset-0 aurora-bg opacity-80" />
      
      {/* Floating Particles/Stars (Simplified CSS visualization) */}
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '50px 50px', opacity: 0.1 }}></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-highlight flex items-center justify-center font-heading font-bold text-2xl mb-4 shadow-lg shadow-primary/30">
            M
          </div>
          <h1 className="text-3xl font-heading font-bold text-gradient tracking-wider">MUSIFY</h1>
          <p className="text-text-secondary mt-2">Enter the soundscape.</p>
        </div>
        
        {/* Glass Card Wrapper */}
        <div className="glass-panel rounded-2xl p-8 relative overflow-hidden">
          {/* subtle top glow on the card */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          
          <Outlet />
        </div>
      </motion.div>
    </div>
  );
}
