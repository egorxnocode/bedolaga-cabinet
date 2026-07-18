import apiClient from './client';
import type { PaginatedResponse, PendingPayment, ManualCheckResponse } from '../types';

export interface PaymentsStats {
  total_pending: number;
  by_method: Record<string, number>;
}

export interface SearchStats {
  total: number;
  pending: number;
  paid: number;
  cancelled: number;
  by_method: Record<string, number>;
}

export interface LavaRefund {
  id: number;
  service_order_id: number;
  user_id: number;
  amount_kopeks: number;
  currency: string;
  status: string;
  reason: string;
  provider_reference: string | null;
  admin_comment: string | null;
  revoke_service: boolean;
  service_revoked_at: string | null;
  refund_transaction_id: number | null;
  requested_at: string;
  completed_at: string | null;
}

export const adminPaymentsApi = {
  // Get all pending payments (admin)
  getPendingPayments: async (params?: {
    page?: number;
    per_page?: number;
    method_filter?: string;
  }): Promise<PaginatedResponse<PendingPayment>> => {
    const response = await apiClient.get<PaginatedResponse<PendingPayment>>(
      '/cabinet/admin/payments',
      {
        params,
      },
    );
    return response.data;
  },

  // Get payments statistics
  getStats: async (): Promise<PaymentsStats> => {
    const response = await apiClient.get<PaymentsStats>('/cabinet/admin/payments/stats');
    return response.data;
  },

  // Search payments with filters
  searchPayments: async (params?: {
    search?: string;
    status_filter?: string;
    method_filter?: string;
    period?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  }): Promise<PaginatedResponse<PendingPayment>> => {
    const response = await apiClient.get<PaginatedResponse<PendingPayment>>(
      '/cabinet/admin/payments/search',
      { params },
    );
    return response.data;
  },

  // Get search statistics with filters
  getSearchStats: async (params?: {
    search?: string;
    status_filter?: string;
    method_filter?: string;
    period?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<SearchStats> => {
    const response = await apiClient.get<SearchStats>('/cabinet/admin/payments/search/stats', {
      params,
    });
    return response.data;
  },

  // Get specific payment details
  getPayment: async (method: string, paymentId: number): Promise<PendingPayment> => {
    const response = await apiClient.get<PendingPayment>(
      `/cabinet/admin/payments/${method}/${paymentId}`,
    );
    return response.data;
  },

  // Manually check payment status
  checkPaymentStatus: async (method: string, paymentId: number): Promise<ManualCheckResponse> => {
    const response = await apiClient.post<ManualCheckResponse>(
      `/cabinet/admin/payments/${method}/${paymentId}/check`,
    );
    return response.data;
  },

  getLavaRefunds: async (): Promise<LavaRefund[]> => {
    const response = await apiClient.get<LavaRefund[]>('/cabinet/admin/payments/lava-refunds');
    return response.data;
  },

  createLavaRefund: async (
    orderId: number,
    data: { reason: string; revoke_service?: boolean },
  ): Promise<LavaRefund> => {
    const response = await apiClient.post<LavaRefund>(
      `/cabinet/admin/payments/lava-orders/${orderId}/refunds`,
      data,
    );
    return response.data;
  },

  confirmLavaRefund: async (
    refundId: number,
    data: { money_returned: boolean; provider_reference: string; admin_comment?: string },
  ): Promise<LavaRefund> => {
    const response = await apiClient.post<LavaRefund>(
      `/cabinet/admin/payments/lava-refunds/${refundId}/confirm`,
      data,
    );
    return response.data;
  },
};
