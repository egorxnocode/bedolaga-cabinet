import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi } from '../../api/subscription';
import { usePlatform } from '../../platform';
import { useDestructiveConfirm } from '../../platform/hooks/useNativeDialog';
import { getErrorMessage } from '../../utils/subscriptionHelpers';
import { openPaymentUrl } from '../../utils/openPaymentUrl';
import type { getGlassColors } from '../../utils/glassTheme';

interface Props {
  subscriptionId?: number;
  formatPrice: (kopeks: number) => string;
  glassColors: ReturnType<typeof getGlassColors>;
}

export function LavaRecurrentCard({ subscriptionId, formatPrice, glassColors: g }: Props) {
  const queryClient = useQueryClient();
  const { platform, openLink } = usePlatform();
  const confirmDisable = useDestructiveConfirm();
  const stateQuery = useQuery({
    queryKey: ['lava-recurrent', subscriptionId],
    queryFn: () => subscriptionApi.getLavaRecurrentState(subscriptionId),
    staleTime: 15_000,
  });
  const current = stateQuery.data?.subscription;
  const cancelMutation = useMutation({
    mutationFn: () => subscriptionApi.unsubscribeLavaRecurrent(subscriptionId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['lava-recurrent', subscriptionId] }),
  });

  if (!current) return null;
  const disable = async () => {
    const confirmed = await confirmDisable(
      'Новые списания прекратятся, уже оплаченный срок сохранится.',
      'Отключить',
      'Отключить автосписание?',
    );
    if (confirmed) cancelMutation.mutate();
  };

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
      <button
        type="button"
        onClick={disable}
        disabled={cancelMutation.isPending}
        className="mt-2 w-full rounded-xl border border-error-400/20 py-2.5 text-xs text-error-400 disabled:opacity-50"
      >
        Отключить автосписание
      </button>
      {cancelMutation.isError && (
        <div className="mt-2 text-xs text-error-400">{getErrorMessage(cancelMutation.error)}</div>
      )}
    </div>
  );
}
