import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router';
import { subscriptionApi } from '../api/subscription';
import { useTheme } from '../hooks/useTheme';
import { getGlassColors } from '../utils/glassTheme';
import { useCurrency } from '../hooks/useCurrency';
import { useHaptic, usePlatform } from '../platform';
import { WebBackButton } from '../components/WebBackButton';
import { openPaymentUrl } from '../utils/openPaymentUrl';
import type { TariffsPurchaseOptions } from '../types';

export default function RenewSubscription() {
  const { subscriptionId } = useParams<{ subscriptionId: string }>();
  const subId = subscriptionId ? Number(subscriptionId) : undefined;

  const { t } = useTranslation();
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);
  const { formatAmount, currencySymbol } = useCurrency();
  const { impact } = useHaptic();
  const { platform, openLink } = usePlatform();

  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useRecurrent, setUseRecurrent] = useState(true);
  const [email, setEmail] = useState('');

  // Load subscription detail for tariff name
  const { data: subscriptionResponse } = useQuery({
    queryKey: ['subscription', subId],
    queryFn: () => subscriptionApi.getSubscription(subId),
    enabled: !!subId,
    staleTime: 30_000,
  });
  const subscription = subscriptionResponse?.subscription ?? null;

  // Load renewal options
  const { data: options, isLoading } = useQuery({
    queryKey: ['renewal-options', subId],
    queryFn: () => subscriptionApi.getRenewalOptions(subId),
    enabled: !!subId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: purchaseOptions } = useQuery({
    queryKey: ['purchase-options', subId],
    queryFn: () => subscriptionApi.getPurchaseOptions(subId),
    staleTime: 0,
  });
  const tariffOptions =
    purchaseOptions && purchaseOptions.sales_mode === 'tariffs'
      ? (purchaseOptions as TariffsPurchaseOptions)
      : undefined;
  const tariff = tariffOptions?.tariffs.find((item) => item.id === subscription?.tariff_id);
  const recurrentAvailable = Boolean(
    selectedPeriod &&
      !subscription?.is_daily &&
      tariff?.lava_recurrent_periods?.includes(selectedPeriod),
  );

  useEffect(() => {
    if (tariffOptions?.lava_recurrent_email) {
      setEmail(tariffOptions.lava_recurrent_email);
    }
  }, [tariffOptions?.lava_recurrent_email]);

  const renewMutation = useMutation({
    mutationFn: (periodDays: number) => {
      if (!subscription?.tariff_id) throw new Error('Тариф подписки не найден');
      const recurrentAvailable = Boolean(tariff?.lava_recurrent_periods?.includes(periodDays));
      return subscriptionApi.checkoutLavaService({
        kind: subscription.is_daily ? 'daily' : 'tariff',
        tariff_id: subscription.tariff_id,
        subscription_id: subId,
        period_days: subscription.is_daily ? 1 : periodDays,
        recurrent: !subscription.is_daily && recurrentAvailable && useRecurrent,
        email: email.trim() || undefined,
        accepted_terms: !subscription.is_daily && recurrentAvailable && useRecurrent,
      });
    },
    onSuccess: (checkout) => {
      openPaymentUrl(checkout.payment_url, platform, openLink);
    },
    onError: (err: unknown) => {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail ?? null)
          : null;

      setError(typeof detail === 'string' ? detail : t('common.error'));
    },
  });

  const handleRenew = (periodDays: number) => {
    impact('medium');
    setError(null);
    renewMutation.mutate(periodDays);
  };

  if (!subId) {
    return <Navigate to="/subscriptions" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex items-center gap-3">
        <WebBackButton to={`/subscriptions/${subId}`} />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: g.text }}>
            {t('subscription.extend', 'Продлить подписку')}
          </h1>
          {subscription?.tariff_name && (
            <p className="mt-1 text-sm" style={{ color: g.textSecondary }}>
              {subscription.tariff_name}
            </p>
          )}
        </div>
      </div>

      {/* Period options */}
      {!options || options.length === 0 ? (
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: g.cardBg, border: `1px solid ${g.cardBorder}` }}
        >
          <p style={{ color: g.textSecondary }}>
            {t('subscription.noRenewalOptions', 'Нет доступных вариантов продления')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {options.map((option) => {
            const isSelected = selectedPeriod === option.period_days;
            const months = Math.max(1, Math.round(option.period_days / 30));
            const perMonth = option.price_kopeks / months;

            return (
              <button
                key={option.period_days}
                onClick={() => {
                  impact('light');
                  setSelectedPeriod(option.period_days);
                  setError(null);
                }}
                className="w-full rounded-2xl border p-4 text-left transition-all duration-200"
                style={{
                  background: isSelected
                    ? isDark
                      ? 'rgba(var(--color-accent-400), 0.08)'
                      : 'rgba(var(--color-accent-400), 0.05)'
                    : g.cardBg,
                  borderColor: isSelected ? 'rgb(var(--color-accent-400))' : g.cardBorder,
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-base font-semibold" style={{ color: g.text }}>
                      {option.period_days} {t('common.units.days', 'дней')}
                    </span>
                    {option.discount_percent > 0 && (
                      <span className="ml-2 rounded-full bg-success-400/15 px-2 py-0.5 text-[10px] font-semibold text-success-400">
                        -{option.discount_percent}%
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-base font-semibold" style={{ color: g.text }}>
                      {option.price_kopeks === 0
                        ? t('subscription.free', 'Бесплатно')
                        : `${formatAmount(option.price_kopeks / 100)} ${currencySymbol}`}
                    </div>
                    {months > 1 && (
                      <div className="text-[11px]" style={{ color: g.textSecondary }}>
                        {formatAmount(perMonth / 100)} {currencySymbol}/
                        {t('common.units.mo', 'мес')}
                      </div>
                    )}
                    {option.original_price_kopeks && (
                      <div className="text-[11px] line-through" style={{ color: g.textSecondary }}>
                        {formatAmount(option.original_price_kopeks / 100)} {currencySymbol}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-error-400/10 p-3 text-center text-sm text-error-400">
          {error}
        </div>
      )}

      {/* Renew button */}
      {selectedPeriod && (
        <div className="space-y-3">
          {recurrentAvailable && (
            <div className="space-y-3 rounded-2xl border border-accent-500/30 bg-accent-500/10 p-4">
              <label className="flex items-start gap-3 text-sm" style={{ color: g.text }}>
                <input
                  type="checkbox"
                  checked={useRecurrent}
                  onChange={(event) => setUseRecurrent(event.target.checked)}
                  className="mt-1"
                />
                <span>
                  Подключить автоматическую оплату с банковской карты. Первое списание — сейчас,
                  следующие — раз в выбранный период.{' '}
                  <a
                    href="/recurrent-payments"
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-400 underline"
                  >
                    Условия
                  </a>
                </span>
              </label>
              <div className="text-sm" style={{ color: g.textSecondary }}>
                {useRecurrent
                  ? 'Способ оплаты: банковская карта'
                  : 'Способы оплаты: СБП, банковская карта'}
              </div>
              {useRecurrent && (
                <div className="space-y-1">
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="E-mail для чека и привязки карты"
                    autoComplete="email"
                    readOnly={!tariffOptions?.lava_recurrent_email_required}
                    className="w-full rounded-xl border border-dark-600 bg-dark-800 px-3 py-2 text-dark-100 read-only:cursor-default read-only:opacity-80"
                  />
                  {!tariffOptions?.lava_recurrent_email_required && (
                    <p className="text-xs" style={{ color: g.textSecondary }}>
                      E-mail сохранён в аккаунте
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          {!recurrentAvailable && (
            <div className="text-sm" style={{ color: g.textSecondary }}>
              Способы оплаты: СБП, банковская карта
            </div>
          )}
          <button
            onClick={() => handleRenew(selectedPeriod)}
            disabled={
              renewMutation.isPending ||
              Boolean(
                recurrentAvailable &&
                  useRecurrent &&
                  tariffOptions?.lava_recurrent_email_required &&
                  !email.trim(),
              )
            }
            className="w-full rounded-2xl bg-accent-500 py-3.5 text-base font-semibold text-on-accent transition-colors hover:bg-accent-600 disabled:opacity-50"
          >
            {renewMutation.isPending
              ? t('common.processing', 'Обработка...')
              : recurrentAvailable && useRecurrent
                ? 'Оплатить и подключить'
                : 'Перейти к оплате'}
          </button>
        </div>
      )}
    </div>
  );
}
