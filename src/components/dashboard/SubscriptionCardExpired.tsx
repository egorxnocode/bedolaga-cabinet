import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Subscription } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { getGlassColors } from '../../utils/glassTheme';
import { ClockIcon, ExclamationIcon, PlusIcon } from '@/components/icons';

interface SubscriptionCardExpiredProps {
  subscription: Subscription;
  className?: string;
}

export default function SubscriptionCardExpired({
  subscription,
  className,
}: SubscriptionCardExpiredProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);

  const formattedDate = new Date(subscription.end_date).toLocaleDateString();

  // Detect limited (traffic exhausted) state
  const isLimited = subscription.is_limited;
  const isDisabledDaily = subscription.status === 'disabled' && subscription.is_daily;

  // Color scheme: amber for limited, red for expired/disabled
  const accent = isLimited
    ? {
        r: 255,
        g: 184,
        b: 0,
        hex: 'rgb(var(--color-urgent-400))',
        gradient: 'linear-gradient(135deg, #FFB800, #FF8C00)',
      }
    : {
        r: 255,
        g: 59,
        b: 92,
        hex: 'rgb(var(--color-critical-500))',
        gradient: 'linear-gradient(135deg, #FF3B5C, #FF6B35)',
      };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl ${className ?? ''}`}
      style={{
        background: g.cardBg,
        border: isDark
          ? `1px solid rgba(${accent.r},${accent.g},${accent.b},0.12)`
          : `1px solid rgba(${accent.r},${accent.g},${accent.b},0.2)`,
        boxShadow: isDark
          ? g.shadow
          : `0 2px 16px rgba(${accent.r},${accent.g},${accent.b},0.1), 0 0 0 1px rgba(${accent.r},${accent.g},${accent.b},0.06)`,
        padding: '28px 28px 24px',
      }}
    >
      {/* Glow */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: -60,
          right: -60,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${accent.r},${accent.g},${accent.b},0.08) 0%, transparent 70%)`,
        }}
        aria-hidden="true"
      />
      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: isDark ? 0.02 : 0.04,
          backgroundImage: isDark
            ? `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`
            : `linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px),
               linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
        aria-hidden="true"
      />

      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]"
          style={{
            background: `rgba(${accent.r},${accent.g},${accent.b},0.1)`,
            border: `1px solid rgba(${accent.r},${accent.g},${accent.b},0.15)`,
            color: accent.hex,
          }}
        >
          {isLimited ? (
            <ExclamationIcon className="h-[22px] w-[22px]" />
          ) : (
            <ClockIcon className="h-[22px] w-[22px]" />
          )}
        </div>
        <h2 className="text-lg font-bold tracking-tight text-dark-50">
          {isLimited
            ? t('subscription.trafficLimitedTitle')
            : isDisabledDaily
              ? t('dashboard.suspended.title')
              : subscription.is_trial
                ? t('dashboard.expired.trialTitle')
                : t('dashboard.expired.title')}
        </h2>
      </div>

      {/* Limited description */}
      {isLimited && (
        <p className="mb-4 text-sm text-dark-50/60">
          {t('subscription.trafficLimitedDescription')}
        </p>
      )}

      {/* Expired date + Balance row */}
      <div
        className="mb-5 flex items-center justify-between rounded-[14px]"
        style={{
          background: `rgba(${accent.r},${accent.g},${accent.b},0.04)`,
          border: `1px solid rgba(${accent.r},${accent.g},${accent.b},0.08)`,
          padding: '14px 18px',
        }}
      >
        <div className="flex items-center">
          <div className="mb-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-dark-50/30">
            {isLimited
              ? t('dashboard.expired.activeUntil')
              : t('dashboard.expired.expiredDate', {
                  context: subscription.is_trial ? 'trial' : '',
                })}
          </div>
          <div className="ml-3 text-base font-bold tracking-tight text-dark-50/50">
            {formattedDate}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2.5">
        {isLimited ? (
          <Link
            to={`/subscriptions/${subscription.id}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-[14px] py-3.5 text-[15px] font-semibold tracking-tight text-white transition-all duration-300"
            style={{
              background: accent.gradient,
              boxShadow: `0 4px 20px rgba(${accent.r},${accent.g},${accent.b},0.2)`,
            }}
          >
            <PlusIcon className="h-4 w-4" />
            {t('subscription.buyTraffic')}
          </Link>
        ) : (
          <Link
            to={`/subscription/purchase?subscriptionId=${subscription.id}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-[14px] py-3.5 text-[15px] font-semibold tracking-tight text-white transition-all duration-300"
            style={{
              background: accent.gradient,
              boxShadow: `0 4px 20px rgba(${accent.r},${accent.g},${accent.b},0.2)`,
            }}
          >
            <PlusIcon className="h-4 w-4" />
            {t('dashboard.expired.tariffs')}
          </Link>
        )}
      </div>
    </div>
  );
}
