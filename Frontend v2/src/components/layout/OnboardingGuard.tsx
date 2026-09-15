import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../lib/apiClient';

export function OnboardingGuard() {
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const checkPreferences = async () => {
      try {
        const response = await apiClient.get('/user/preferences');
        if (active) {
          const prefs = response.data.data;
          // If favouriteLanguages is empty, they need onboarding
          const hasPrefs = prefs && prefs.favouriteLanguages && prefs.favouriteLanguages.length > 0;
          setNeedsOnboarding(!hasPrefs);
        }
      } catch (err) {
        console.error('Error checking preferences:', err);
        // If we fail to fetch preferences, default to not redirecting to avoid locking users out
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    checkPreferences();
    return () => {
      active = false;
    };
  }, [isAuthenticated, location.pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  // If user needs onboarding and isn't already on the onboarding page, redirect there
  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // If user has completed onboarding and is trying to go to /onboarding, redirect to home
  // Unless they explicitly navigate to it to edit preferences
  if (!needsOnboarding && location.pathname === '/onboarding' && !location.search.includes('edit=true')) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
