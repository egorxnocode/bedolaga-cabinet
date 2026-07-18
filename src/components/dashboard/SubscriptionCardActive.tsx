import type { UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

import {
  ArrowRightIcon,
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

  const connectDevice = () => {
    if (isAtDeviceLimit || !subscription.subscription_url) {
      haptic.notification('error');
      return;
    }
    navigate(`/connection?sub=${subscription.id}`);
  };

  return (
    <section className="cabinet-dashboard-stack" aria-label={t('dashboard.yourSubscription')}>
      <article className="cabinet-subscription-hero">
        <div className="cabinet-card-heading">
          <span className="cabinet-eyebrow">
            {subscription.is_trial ? t('subscription.trialStatus') : t('dashboard.tariff')}
          </span>
          <span className="cabinet-status-pill">
            <i aria-hidden="true" />
            {t('subscription.active')}
          </span>
        </div>

        <div>
          <h2>{planName}</h2>
          <p>
            {subscription.is_trial
              ? t('dashboard.trialOffer.freeDesc')
              : `${t('dashboard.remaining')}: ${subscription.days_left} ${t('subscription.daysShort')}`}
          </p>
        </div>

        <Link to={`/subscriptions/${subscription.id}`} className="cabinet-primary-action">
          <span>{t('dashboard.viewSubscription')}</span>
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </article>

      <div className="cabinet-metric-grid">
        <article className="cabinet-metric-card cabinet-metric-card-gold">
          <div className="cabinet-metric-label">
            <TrafficIcon className="h-4 w-4" />
            <span>{t('dashboard.trafficUsageTitle')}</span>
          </div>
          <strong>{isUnlimited ? '∞' : formatTraffic(remainingGb)}</strong>
          <div className="cabinet-meter" aria-hidden="true">
            <span className="cabinet-meter-fill" style={{ width: `${remainingPercent}%` }} />
          </div>
          <small>
            {isUnlimited
              ? t('dashboard.unlimited')
              : `${formatTraffic(usedGb)} ${t('dashboard.usedSuffix')}`}
          </small>
        </article>

        <article className="cabinet-metric-card cabinet-metric-card-sage">
          <div className="cabinet-metric-label">
            <DevicesIcon className="h-4 w-4" />
            <span>{t('subscription.devices')}</span>
          </div>
          <strong>
            {connectedDevices}
            <span className="cabinet-metric-value-suffix">
              {' '}
              / {subscription.device_limit === 0 ? '∞' : subscription.device_limit}
            </span>
          </strong>
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
        </article>
      </div>

      {subscription.subscription_url && (
        <button
          type="button"
          className="cabinet-quick-action"
          onClick={connectDevice}
          disabled={isAtDeviceLimit}
          data-onboarding="connect-devices"
        >
          <span className="cabinet-quick-action-icon">
            <PlusIcon className="h-5 w-5" />
          </span>
          <span className="cabinet-quick-action-copy">
            <small>{t('dashboard.quickActions')}</small>
            <strong>{t('dashboard.connectDevice')}</strong>
            <span className="cabinet-quick-action-meta">
              {subscription.device_limit === 0
                ? t('dashboard.devicesConnectedUnlimited', { used: connectedDevices })
                : t('dashboard.devicesOfMax', {
                    used: connectedDevices,
                    max: subscription.device_limit,
                  })}
            </span>
          </span>
          <ArrowRightIcon className="h-5 w-5" />
        </button>
      )}

      <button
        type="button"
        className="cabinet-refresh-action"
        onClick={() => refreshTrafficMutation.mutate()}
        disabled={refreshTrafficMutation.isPending || trafficRefreshCooldown > 0}
      >
        <RefreshIcon
          className={`h-3.5 w-3.5 ${refreshTrafficMutation.isPending ? 'animate-spin' : ''}`}
        />
        {trafficRefreshCooldown > 0 ? `${trafficRefreshCooldown}s` : t('common.refresh')}
      </button>
    </section>
  );
}
