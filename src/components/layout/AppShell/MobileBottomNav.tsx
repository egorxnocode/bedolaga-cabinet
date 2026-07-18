import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { usePlatform } from '@/platform';

// Icons
import { ChatIcon, HomeIcon, SubscriptionIcon, UserIcon } from './icons';

interface MobileBottomNavProps {
  isKeyboardOpen: boolean;
}

export function MobileBottomNav({ isKeyboardOpen }: MobileBottomNavProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { haptic } = usePlatform();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const coreItems = [
    { path: '/', label: t('nav.dashboard'), icon: HomeIcon },
    { path: '/subscriptions', label: t('nav.subscription'), icon: SubscriptionIcon },
    { path: '/support', label: t('nav.support'), icon: ChatIcon },
    { path: '/profile', label: t('nav.profile'), icon: UserIcon },
  ];

  const handleNavClick = () => {
    haptic.impact('light');
  };

  return (
    <nav
      className={cn(
        'fixed z-50 transition-all duration-200 lg:hidden',
        'cabinet-bottom-nav bg-dark-900/95 backdrop-blur-linear',
        'border border-dark-700/30',
        isKeyboardOpen ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
      style={{
        bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        left: '16px',
        right: '16px',
        borderRadius: 'var(--bento-radius, 24px)',
        padding: '8px 4px',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
      }}
    >
      <div className="flex justify-around">
        {coreItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={handleNavClick}
            className={cn(
              'relative flex min-w-[56px] flex-1 shrink-0 flex-col items-center justify-center rounded-2xl px-3 py-2.5 transition-all duration-200',
              isActive(item.path) ? 'text-[#b09a61]' : 'text-dark-400 hover:text-dark-200',
            )}
          >
            {isActive(item.path) && (
              <motion.div
                layoutId="bottom-nav-active"
                className="cabinet-bottom-nav-active absolute inset-0 rounded-2xl"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
            <item.icon className="relative z-10 h-5 w-5" />
            <span className="relative z-10 mt-1 whitespace-nowrap text-2xs">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
