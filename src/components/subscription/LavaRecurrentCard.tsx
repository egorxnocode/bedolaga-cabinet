import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { subscriptionApi } from '../../api/subscription';
import { useToast } from '../Toast';
import { usePlatform } from '../../platform';
import { useDestructiveConfirm } from '../../platform/hooks/useNativeDialog';
import { getErrorMessage } from '../../utils/subscriptionHelpers';
import { openPaymentUrl } from '../../utils/openPaymentUrl';
import type { getGlassColors } from '../../utils/glassTheme';

interface Props {
  subscriptionId?: number;
  formatPrice: (kopeks: number) => string;
  glassColors: ReturnType<typeof getGlassColors>;
  endDate: string;
}

export function LavaRecurrentCard({ subscriptionId, formatPrice, glassColors: g, endDate }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { platform, openLink } = usePlatform();
  const confirmDisable = useDestructiveConfirm();
  const stateQuery = useQuery({
    queryKey: ['lava-recurrent', subscriptionId],
    queryFn: () => subscriptionApi.getLavaRecurrentState(subscriptionId),
    staleTime: 15_000,
  });
  const current = stateQuery.data?.subscription;
  const cancelMutation = useMutation({
    mutationFn: (recurrentId: number) => subscriptionApi.unsubscribeLavaRecurrentById(recurrentId),
    onSuccess: (result) => {
      showToast({
        type: result.success ? 'success' : 'info',
        title: result.success ? 'Автоматическая оплата отключена' : 'Отключение обрабатывается',
        message: result.success
          ? `Подписка продолжит работать до ${new Date(endDate).toLocaleDateString()}.`
          : 'Мы автоматически повторим запрос к Lava.',
      });
      queryClient.invalidateQueries({ queryKey: ['lava-recurrent', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['lava-recurrent-agreements'] });
    },
  });

  if (!current) return null;
  const disable = async () => {
    const formattedEndDate = new Date(endDate).toLocaleDateString();
    const confirmed = await confirmDisable(
      `Новых списаний не будет. Подписка продолжит работать до ${formattedEndDate}. Уже оплаченный период сохранится.`,
      'Отключить',
      'Отключить автоматическую оплату?',
    );
    if (confirmed) cancelMutation.mutate(current.id);
  };

  if (current.status === 'deactivated') {
    const renewalSubscriptionId = current.subscription_id ?? subscriptionId;
    return (
      <div
        className="rounded-[14px] p-3.5"
        style={{ background: g.innerBg, border: `1px solid ${g.innerBorder}` }}
      >
        <div className="text-sm font-semibold text-dark-50">Автоматическая оплата отключена</div>
        <div className="mt-1 text-xs" style={{ color: g.textSecondary }}>
          Подключить её снова можно при следующей оплате или досрочном продлении.
        </div>
        <button
          type="button"
          onClick={() =>
            navigate(
              renewalSubscriptionId
                ? `/subscriptions/${renewalSubscriptionId}/renew`
                : '/subscription/purchase',
            )
          }
          className="mt-3 w-full rounded-xl bg-accent-500 py-2.5 text-sm font-semibold text-white"
        >
          Продлить и подключить автоплатёж
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-[14px] p-3.5"
      style={{ background: g.innerBg, border: `1px solid ${g.innerBorder}` }}
    >
      <div className="text-sm font-semibold text-dark-50">Автосписание через Lava</div>
      <div className="mt-1 text-xs" style={{ color: g.textSecondary }}>
        {current.status === 'activated'
          ? 'Подключено'
          : current.status === 'created'
            ? 'Ожидает подтверждения карты'
            : current.status === 'cancel_requested'
              ? 'Отключение обрабатывается'
              : 'Требует внимания'}
      </div>
      <div className="mt-3 rounded-xl p-3 text-xs" style={{ background: g.hoverBg }}>
        <div className="flex justify-between">
          <span>{current.period_days} дней</span>
          <b>{formatPrice(current.amount_kopeks)}</b>
        </div>
        {current.next_pay_at && (
          <div className="mt-1">
            Следующее списание: {new Date(current.next_pay_at).toLocaleDateString()}
          </div>
        )}
      </div>
      {current.status === 'created' && current.payment_url && (
        <button
          type="button"
          onClick={() =>
            current.payment_url && openPaymentUrl(current.payment_url, platform, openLink)
          }
          className="mt-2 w-full rounded-xl bg-accent-500 py-2.5 text-sm font-semibold text-white"
        >
          Продолжить оплату
        </button>
      )}
      {current.status !== 'cancel_requested' && (
        <button
          type="button"
          onClick={disable}
          disabled={cancelMutation.isPending}
          className="mt-2 w-full rounded-xl border border-error-400/20 py-2.5 text-xs text-error-400 disabled:opacity-50"
        >
          Отключить автоматическую оплату
        </button>
      )}
      {cancelMutation.isError && (
        <div className="mt-2 text-xs text-error-400">{getErrorMessage(cancelMutation.error)}</div>
      )}
    </div>
  );
}
