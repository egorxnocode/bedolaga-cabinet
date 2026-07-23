import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LavaRecurrentSubscription } from '../../api/subscription';
import { subscriptionApi } from '../../api/subscription';
import { useCurrency } from '../../hooks/useCurrency';
import { usePlatform } from '../../platform';
import { useDestructiveConfirm } from '../../platform/hooks/useNativeDialog';
import { openPaymentUrl } from '../../utils/openPaymentUrl';
import { useToast } from '../Toast';

export function PendingLavaRecurrentCard({ agreement }: { agreement: LavaRecurrentSubscription }) {
  const queryClient = useQueryClient();
  const confirmCancel = useDestructiveConfirm();
  const { showToast } = useToast();
  const { formatAmount, currencySymbol } = useCurrency();
  const { platform, openLink } = usePlatform();
  const cancelMutation = useMutation({
    mutationFn: () => subscriptionApi.unsubscribeLavaRecurrentById(agreement.id),
    onSuccess: (result) => {
      showToast({
        type: result.success ? 'success' : 'info',
        title: result.success ? 'Подключение отменено' : 'Отключение обрабатывается',
        message: result.success
          ? 'Деньги не списаны, подписка и баланс не изменились.'
          : 'Мы автоматически повторим запрос к Lava.',
      });
      queryClient.invalidateQueries({ queryKey: ['lava-recurrent-agreements'] });
    },
  });

  const cancel = async () => {
    const confirmed = await confirmCancel(
      'Незавершённая привязка карты будет отменена. Деньги и срок подписки не изменятся.',
      'Отменить подключение',
      'Отменить автоматическую оплату?',
    );
    if (confirmed) cancelMutation.mutate();
  };

  return (
    <div className="rounded-2xl border border-accent-500/25 bg-accent-500/10 p-4">
      <div className="font-semibold text-dark-100">
        {agreement.status === 'cancel_requested'
          ? 'Отключение автоматической оплаты'
          : 'Подключение автоматической оплаты не завершено'}
      </div>
      <div className="mt-1 text-sm text-dark-300">
        {agreement.tariff_name || 'Подписка'} · {agreement.period_days} дней ·{' '}
        {formatAmount(agreement.amount_kopeks / 100)} {currencySymbol}
      </div>
      {agreement.status === 'cancel_requested' ? (
        <div className="mt-3 text-sm text-dark-400">
          Запрос сохранён. Мы повторяем отключение в Lava автоматически.
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {agreement.payment_url && (
            <button
              type="button"
              onClick={() =>
                agreement.payment_url && openPaymentUrl(agreement.payment_url, platform, openLink)
              }
              className="rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Продолжить оплату
            </button>
          )}
          <button
            type="button"
            onClick={cancel}
            disabled={cancelMutation.isPending}
            className="rounded-xl border border-error-400/25 px-4 py-2.5 text-sm text-error-400 disabled:opacity-50"
          >
            Отменить подключение
          </button>
        </div>
      )}
    </div>
  );
}
