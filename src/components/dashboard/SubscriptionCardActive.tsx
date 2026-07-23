import type { UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

import {
  ArrowRightIcon,
  ChatIcon,
  DevicesIcon,
  PlusIcon,
  RefreshIcon,
  TrafficIcon,
} from '@/components/icons';
import { useHaptic } from '@/platform';
import type { Subscription } from '@/types';
import { formatTraffic } from '@/utils/formatTraffic';

interface SubscriptionCardActiveProps {
  subscription: Subscription;
  trafficData: {
    traffic_used_gb: number;
    traffic_used_percent: number;
    is_unlimited: boolean;
  } | null;
  refreshTrafficMutation: UseMutationResult<unknown, unknown, void, unknown>;
  trafficRefreshCooldown: number;
  connectedDevices: number;
}

export default function SubscriptionCardActive({
  subscription,
  trafficData,
  refreshTrafficMutation,
  trafficRefreshCooldown,
  connectedDevices,
}: SubscriptionCardActiveProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const haptic = useHaptic();

  const usedPercent = trafficData?.traffic_used_percent ?? subscription.traffic_used_percent;
  const usedGb = trafficData?.traffic_used_gb ?? subscription.traffic_used_gb;
  const isUnlimited = trafficData?.is_unlimited ?? subscription.traffic_limit_gb === 0;
  const remainingGb = Math.max(subscription.traffic_limit_gb - usedGb, 0);
  const remainingPercent = isUnlimited ? 100 : Math.max(0, Math.min(100, 100 - usedPercent));
  const isAtDeviceLimit =
    subscription.device_limit > 0 && connectedDevices >= subscription.device_limit;
  const planName = subscription.tariff_name || t('subscription.currentPlan');
  const deviceLimitLabel = subscription.device_limit === 0 ? '∞' : subscription.device_limit;

  const connectDevice = () => {
    if (isAtDeviceLimit || !subscription.subscription_url) {
      haptic.notification('error');
      return;
    }
    navigate(`/connection?sub=${subscription.id}`);
  };

  return (
    <section className="cabinet-subcard-stack" aria-label={t('dashboard.yourSubscription')}>
      {/* HERO — subscription card (KOHO-style membership card) */}
      <article className="cabinet-subcard-hero">
        <span className="cabinet-subcard-hero-sheen" aria-hidden="true" />
        <div className="cabinet-subcard-hero-top">
          <span className="cabinet-subcard-brand">
            <svg viewBox="0 0 48 40" className="cabinet-subcard-mark" aria-hidden="true">
              <path d="M4 36 18 8l14 28" />
              <path d="M12 36 18 24l6 12" />
            </svg>
            НаСвязи
          </span>
          <span className="cabinet-subcard-status">
            <i aria-hidden="true" />
            {t('subscription.active')}
          </span>
        </div>
        <div className="cabinet-subcard-hero-body">
          <span className="cabinet-subcard-plan">{planName}</span>
          <span className="cabinet-subcard-days">
            {subscription.is_trial
              ? t('dashboard.trialOffer.freeDesc')
              : `${t('dashboard.remaining')}: ${subscription.days_left} ${t('subscription.daysShort')}`}
          </span>
        </div>
        <Link to={`/subscriptions/${subscription.id}`} className="cabinet-subcard-open">
          <span>{t('dashboard.viewSubscription')}</span>
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </article>

      {/* Round action buttons */}
      <div className="cabinet-subcard-actions">
        {subscription.subscription_url && (
          <button
            type="button"
            className="cabinet-subcard-action"
            onClick={connectDevice}
            disabled={isAtDeviceLimit}
            data-onboarding="connect-devices"
          >
            <span className="cabinet-subcard-action-icon">
              <PlusIcon className="h-5 w-5" />
            </span>
            <small>{t('dashboard.connectDevice')}</small>
          </button>
        )}
        <button
          type="button"
          className="cabinet-subcard-action"
          onClick={() => refreshTrafficMutation.mutate()}
          disabled={refreshTrafficMutation.isPending || trafficRefreshCooldown > 0}
        >
          <span className="cabinet-subcard-action-icon">
            <RefreshIcon
              className={refreshTrafficMutation.isPending ? 'h-5 w-5 animate-spin' : 'h-5 w-5'}
            />
          </span>
          <small>
            {trafficRefreshCooldown > 0 ? `${trafficRefreshCooldown}s` : t('common.refresh')}
          </small>
        </button>
        <Link to="/support" className="cabinet-subcard-action">
          <span className="cabinet-subcard-action-icon">
            <ChatIcon className="h-5 w-5" />
          </span>
          <small>{t('nav.support')}</small>
        </Link>
      </div>

      {/* Stat rows */}
      <div className="cabinet-subcard-stats">
        <div className="cabinet-subcard-stat">
          <div className="cabinet-subcard-stat-head">
            <TrafficIcon className="h-4 w-4" />
            <span>{t('dashboard.trafficUsageTitle')}</span>
            <strong>{isUnlimited ? '∞' : formatTraffic(remainingGb)}</strong>
          </div>
          <div className="cabinet-meter" aria-hidden="true">
            <span className="cabinet-meter-fill" style={{ width: `${remainingPercent}%` }} />
          </div>
          <small>
            {isUnlimited
              ? t('dashboard.unlimited')
              : `${formatTraffic(usedGb)} ${t('dashboard.usedSuffix')}`}
          </small>
        </div>

        <div className="cabinet-subcard-stat">
          <div className="cabinet-subcard-stat-head">
            <DevicesIcon className="h-4 w-4" />
            <span>{t('subscription.devices')}</span>
            <strong>
              {connectedDevices}
              <span className="cabinet-metric-value-suffix"> / {deviceLimitLabel}</span>
            </strong>
          </div>
          <div className="cabinet-device-dots" aria-hidden="true">
            {Array.from(
              { length: Math.min(Math.max(subscription.device_limit || 3, 3), 5) },
              (_, index) => (
                <i key={index} className={index < connectedDevices ? 'is-used' : ''} />
              ),
            )}
          </div>
          <small>
            {isAtDeviceLimit
              ? t('dashboard.deviceLimitReached')
              : t('dashboard.devicesConnected', { count: connectedDevices })}
          </small>
        </div>
      </div>
    </section>
  );
}
