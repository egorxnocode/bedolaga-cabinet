import { cn } from '@/lib/utils';

interface BrandLockupProps {
  appName: string;
  hasCustomLogo: boolean;
  logoUrl: string | null;
  logoLoaded?: boolean;
  onLogoLoad?: () => void;
  className?: string;
}

export function BrandLockup({
  appName,
  hasCustomLogo,
  logoUrl,
  logoLoaded = true,
  onLogoLoad,
  className,
}: BrandLockupProps) {
  const useCustomLogo = hasCustomLogo && logoUrl;

  return (
    <span className={cn('brand-lockup-frame', className)}>
      <img
        src={useCustomLogo ? logoUrl : '/brand/nasvyazi-lockup.svg'}
        alt={appName || 'НаСвязи'}
        className={cn('brand-lockup-image', useCustomLogo && !logoLoaded && 'opacity-0')}
        onLoad={onLogoLoad}
      />
      {useCustomLogo && !logoLoaded && (
        <img
          src="/brand/nasvyazi-lockup.svg"
          alt=""
          aria-hidden="true"
          className="brand-lockup-image absolute inset-0"
        />
      )}
    </span>
  );
}
