import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { subscriptionApi } from '../../api/subscription';
import { usePlatform } from '../../platform';
import { useDestructiveConfirm } from '../../platform/hooks/useNativeDialog';
import { getErrorMessage } from '../../utils/subscriptionHelpers';
import { openPaymentUrl } from '../../utils/openPaymentUrl';
import type { getGlassColors } from '../../utils/glassTheme';

interface LavaRecurrentCardProps {
  subscriptionId?: number;
  formatPrice: (kopeks: number) => string;
  glassColors: ReturnType<typeof getGlassColors>;
}

const periodLabel = (days: number): string => {
  if (days === 30) return '1 месяц';
  if (days === 90) return '3 месяца';
  if (days === 180) return '6 месяцев';
  if (days === 365) return '12 месяцев';
  return `${days} дней`;
};

export function LavaRecurrentCard({
  subscriptionId,
  formatPrice,
  glassColors: g,
}: LavaRecurrentCardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { platform, openLink } = usePlatform();
  const confirmDisable = useDestructiveConfirm();
  const [expanded, setExpanded] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  const stateQuery = useQuery({
    queryKey: ['lava-recurrent', subscriptionId],
    queryFn: () => subscriptionApi.getLavaRecurrentState(subscriptionId),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const state = stateQuery.data;
  useEffect(() => {
    if (selectedPeriod == null && state?.plans.length) {
      setSelectedPeriod(state.plans[0].period_days);
    }
  }, [selectedPeriod, state?.plans]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['lava-recurrent', subscriptionId] });
    queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
    queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
  };

  const subscribeMutation = useMutation({
    mutationFn: () => {
      if (selectedPeriod == null) throw new Error('Выберите период');
      return subscriptionApi.subscribeLavaRecurrent(
        selectedPeriod,
        email.trim() || undefined,
        subscriptionId,
      );
    },
    onSuccess: ({ payment_url }) => {
      setError('');
      refresh();
      openPaymentUrl(payment_url, platform, openLink);
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const unsubscribeMutation = useMutation({
    mutationFn: () => subscriptionApi.unsubscribeLavaRecurrent(subscriptionId),
    onSuccess: () => {
      setError('');
      setExpanded(false);
      refresh();
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  if (stateQuery.isLoading || !state?.enabled) return null;

  const current = state.subscription;
  const openPayment = () => {
    if (current?.payment_url) openPaymentUrl(current.payment_url, platform, openLink);
  };
  const disable = async () => {
    const confirmed = await confirmDisable(
      t(
        'subscription.lavaRecurrent.disableWarning',
        'Новые списания с карты прекратятся. Уже оплаченный срок сохранится.',
      ),
      t('subscription.lavaRecurrent.disableConfirm', 'Отключить'),
      t('subscription.lavaRecurrent.disableTitle', 'Отключить автосписание?'),
    );
    if (confirmed) unsubscribeMutation.mutate();
  };

  return (
    <div
      className="rounded-[14px] p-3.5"
      style={{ background: g.innerBg, border: `1px solid ${g.innerBorder}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-dark-50">
            {t('subscription.lavaRecurrent.title', 'Автосписание с карты')}
          </div>
          <div className="mt-0.5 text-[11px] text-dark-50/35">
            {current?.status === 'activated'
              ? t('subscription.lavaRecurrent.active', 'Подключено через Lava')
              : current?.status === 'suspended'
                ? t('subscription.lavaRecurrent.suspended', 'Последнее списание не прошло')
                : current?.status === 'created'
                  ? t('subscription.lavaRecurrent.awaiting', 'Ожидает подтверждения карты')
                  : t('subscription.lavaRecurrent.description', 'Продление без ручной оплаты')}
          </div>
        </div>
        {current?.status === 'activated' && (
          <span className="rounded-full bg-success-500/10 px-2 py-1 text-[10px] font-semibold text-success-400">
            {t('common.active', 'Активно')}
          </span>
        )}
      </div>

      {current ? (
        <div className="mt-3 space-y-2">
          <div className="rounded-xl p-3 text-xs" style={{ background: g.hoverBg }}>
            <div className="flex justify-between gap-3">
              <span style={{ color: g.textSecondary }}>{periodLabel(current.period_days)}</span>
              <span className="font-semibold text-dark-50">
                {formatPrice(current.amount_kopeks)}
              </span>
            </div>
            {current.payer_details && (
              <div className="mt-1" style={{ color: g.textSecondary }}>
                {current.payer_details}
              </div>
            )}
            {current.next_pay_at && (
              <div className="mt-1" style={{ color: g.textSecondary }}>
                {t('subscription.lavaRecurrent.nextCharge', 'Следующее списание')}:{' '}
                {new Date(current.next_pay_at).toLocaleDateString()}
              </div>
            )}
          </div>
          {current.status === 'created' && current.payment_url && (
            <button
              type="button"
              onClick={openPayment}
              className="w-full rounded-xl bg-accent-500 py-2.5 text-sm font-semibold text-white"
            >
              {t('subscription.lavaRecurrent.continue', 'Продолжить подключение')}
            </button>
          )}
          <button
            type="button"
            onClick={disable}
            disabled={unsubscribeMutation.isPending}
            className="w-full rounded-xl border border-error-400/20 py-2.5 text-xs font-medium text-error-400 disabled:opacity-50"
          >
            {t('subscription.lavaRecurrent.disable', 'Отключить автосписание')}
          </button>
        </div>
      ) : !state.eligible ? (
        state.available_from && (
          <div className="mt-3 text-xs" style={{ color: g.textSecondary }}>
            {t(
              'subscription.lavaRecurrent.availableLater',
              'Подключение станет доступно за 3 дня до окончания — {{date}}',
              { date: new Date(state.available_from).toLocaleDateString() },
            )}
          </div>
        )
      ) : !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-3 w-full rounded-xl bg-accent-500/10 py-2.5 text-sm font-semibold text-accent-400"
        >
          {t('subscription.lavaRecurrent.connect', 'Подключить автосписание')}
        </button>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {state.plans.map((plan) => (
              <button
                type="button"
                key={plan.product_id}
                onClick={() => setSelectedPeriod(plan.period_days)}
                className="rounded-xl p-2.5 text-left text-xs"
                style={{
                  background:
                    selectedPeriod === plan.period_days
                      ? 'rgba(var(--color-accent-500),0.12)'
                      : g.hoverBg,
                  border:
                    selectedPeriod === plan.period_days
                      ? '1px solid rgb(var(--color-accent-500))'
                      : `1px solid ${g.innerBorder}`,
                }}
              >
                <div className="font-semibold text-dark-50">{periodLabel(plan.period_days)}</div>
                <div className="mt-0.5" style={{ color: g.textSecondary }}>
                  {formatPrice(plan.amount_kopeks)}
                </div>
              </button>
            ))}
          </div>

          {state.email_required && (
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="E-mail"
              autoComplete="email"
              className="w-full rounded-xl px-3 py-2.5 text-sm text-dark-50 outline-none"
              style={{ background: g.hoverBg, border: `1px solid ${g.innerBorder}` }}
            />
          )}

          <label className="flex items-start gap-2 text-[11px]" style={{ color: g.textSecondary }}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              {t('subscription.lavaRecurrent.consentPrefix', 'Соглашаюсь с условиями')}{' '}
              <Link to="/recurrent-payments" target="_blank" className="text-accent-400 underline">
                {t('subscription.lavaRecurrent.consentLink', 'рекуррентных платежей')}
              </Link>
            </span>
          </label>

          {error && <div className="text-xs text-error-400">{error}</div>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => subscribeMutation.mutate()}
              disabled={
                !accepted || subscribeMutation.isPending || (state.email_required && !email.trim())
              }
              className="flex-1 rounded-xl bg-accent-500 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {subscribeMutation.isPending
                ? t('common.processing', 'Обработка...')
                : t('subscription.lavaRecurrent.payAndConnect', 'Оплатить и подключить')}
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-xl px-3 py-2.5 text-sm"
              style={{ color: g.textSecondary, background: g.hoverBg }}
            >
              {t('common.cancel', 'Отмена')}
            </button>
          </div>
        </div>
      )}

      {error && current && <div className="mt-2 text-xs text-error-400">{error}</div>}
    </div>
  );
}
