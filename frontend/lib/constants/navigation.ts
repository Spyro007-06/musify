import {
  Home,
  Search,
  Compass,
  Radio,
  Library,
  Heart,
  History,
  ListMusic,
  Disc3,
  Sparkles,
  Wand2,
  FileText,
  LucideIcon,
} from 'lucide-react';
import { ROUTES } from './routes';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  requiresAuth?: boolean;
  section?: 'main' | 'library' | 'ai';
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    title: 'Home',
    href: ROUTES.APP.HOME,
    icon: Home,
    exact: true,
    requiresAuth: true,
    section: 'main',
  },
  {
    title: 'Search',
    href: ROUTES.APP.SEARCH,
    icon: Search,
    exact: false,
    requiresAuth: false, // public / optional auth
    section: 'main',
  },
  {
    title: 'Discover',
    href: ROUTES.APP.DISCOVER,
    icon: Compass,
    exact: false,
    requiresAuth: true,
    section: 'main',
  },
  {
    title: 'Browse',
    href: ROUTES.APP.BROWSE,
    icon: Radio,
    exact: false,
    requiresAuth: true,
    section: 'main',
  },
];

export const LIBRARY_NAV_ITEMS: NavItem[] = [
  {
    title: 'Your Library',
    href: ROUTES.APP.LIBRARY.INDEX,
    icon: Library,
    exact: true,
    requiresAuth: true,
    section: 'library',
  },
  {
    title: 'Liked Songs',
    href: ROUTES.APP.LIBRARY.LIKED,
    icon: Heart,
    exact: true,
    requiresAuth: true,
    section: 'library',
  },
  {
    title: 'Recently Played',
    href: ROUTES.APP.LIBRARY.RECENTLY_PLAYED,
    icon: History,
    exact: true,
    requiresAuth: true,
    section: 'library',
  },
  {
    title: 'Playlists',
    href: ROUTES.APP.LIBRARY.PLAYLISTS,
    icon: ListMusic,
    exact: true,
    requiresAuth: true,
    section: 'library',
  },
  {
    title: 'Albums',
    href: ROUTES.APP.LIBRARY.ALBUMS,
    icon: Disc3,
    exact: true,
    requiresAuth: true,
    section: 'library',
  },
];

export const AI_NAV_ITEMS: NavItem[] = [
  {
    title: 'AI Studio',
    href: ROUTES.APP.AI.INDEX,
    icon: Sparkles,
    exact: true,
    requiresAuth: true,
    section: 'ai',
  },
  {
    title: 'AI Playlist',
    href: ROUTES.APP.AI.PLAYLIST,
    icon: Wand2,
    exact: true,
    requiresAuth: true,
    section: 'ai',
  },
  {
    title: 'Lyrics & Vibes',
    href: ROUTES.APP.AI.LYRICS,
    icon: FileText,
    exact: true,
    requiresAuth: true,
    section: 'ai',
  },
];

export const MOBILE_PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    title: 'Home',
    href: ROUTES.APP.HOME,
    icon: Home,
    exact: true,
    requiresAuth: true,
  },
  {
    title: 'Search',
    href: ROUTES.APP.SEARCH,
    icon: Search,
    exact: false,
    requiresAuth: false,
  },
  {
    title: 'Discover',
    href: ROUTES.APP.DISCOVER,
    icon: Compass,
    exact: false,
    requiresAuth: true,
  },
  {
    title: 'Library',
    href: ROUTES.APP.LIBRARY.INDEX,
    icon: Library,
    exact: false,
    requiresAuth: true,
  },
];

/**
 * Accurately determines if a navigation item is active given current pathname.
 * Avoids false positives such as /albums matching /album/[id].
 */
export function isNavItemActive(pathname: string, href: string, exact = false): boolean {
  if (exact) {
    return pathname === href;
  }
  if (pathname === href) {
    return true;
  }
  return pathname.startsWith(href + '/');
}
