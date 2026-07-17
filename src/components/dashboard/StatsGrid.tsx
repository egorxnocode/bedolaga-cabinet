import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useCurrency } from '../../hooks/useCurrency';
import { StatCard } from '@/components/stats';
import { ChevronRightIcon, UsersIcon } from '@/components/icons';

interface StatsGridProps {
  referralCount: number;
  earningsRubles: number;
  refLoading: boolean;
}

export default function StatsGrid({ referralCount, earningsRubles, refLoading }: StatsGridProps) {
  const { t } = useTranslation();
  const { formatAmount, currencySymbol } = useCurrency();

  const chevron = <ChevronRightIcon className="h-4 w-4 shrink-0 text-dark-500" />;

  return (
    <div className="grid grid-cols-1 gap-2.5">
      <Link to="/referral" className="block h-full">
        <StatCard
          label={t('dashboard.stats.referrals')}
          value={`${referralCount}`}
          subValue={`+${formatAmount(earningsRubles)} ${currencySymbol}`}
          icon={<UsersIcon className="h-5 w-5" />}
          tone="neutral"
          loading={refLoading}
          trailing={chevron}
        />
      </Link>
    </div>
  );
}
