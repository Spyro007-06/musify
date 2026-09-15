import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import AuthLayout from '../components/layout/AuthLayout';
import Login from '../features/auth/Login';
import Signup from '../features/auth/Signup';
import { useAuthStore } from '../store/useAuthStore';
import { OnboardingGuard } from '../components/layout/OnboardingGuard';
import Onboarding from '../features/onboarding/Onboarding';
import ProfilePage from '../features/profile/ProfilePage';

import Home from '../features/home/Home';
import SearchPage from '../features/search/SearchPage';
import AlbumDetail from '../features/albums/AlbumDetail';
import ArtistDetail from '../features/artists/ArtistDetail';
import PlaylistDetail from '../features/playlists/PlaylistDetail';
import LibraryPage from '../features/library/LibraryPage';

// Protected Route Wrapper
const ProtectedRoute = () => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Authentication Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>

        {/* Protected App Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<Onboarding />} />

          <Route element={<OnboardingGuard />}>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Home />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="album/:id" element={<AlbumDetail />} />
              <Route path="artist/:id" element={<ArtistDetail />} />
              <Route path="playlist/:id" element={<PlaylistDetail />} />
              <Route path="library" element={<LibraryPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>
        </Route>
        
        {/* 404 Catch All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
