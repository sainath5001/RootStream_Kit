import { useQuery } from "@apollo/client/react";
import { ANALYTICS_QUERY, STREAM_PAYMENTS_QUERY, USER_PAYMENTS_QUERY, USER_STREAMS_QUERY } from "@/lib/queries";

type AnalyticsResult = {
  Analytics_by_pk: {
    totalStreams: number;
    activeStreams: number;
    totalPayments: number;
    totalPaid: string;
    totalDeposited: string;
    totalWithdrawn: string;
    updatedAt: string;
  } | null;
};

type StreamRow = {
  id: string;
  streamId: string;
  active: boolean;
  amountPerInterval: string;
  interval: string;
  lastExecuted: string;
  totalPaid: string;
  executionCount: number;
  createdAt: string;
  sender: { id: string };
  recipient: { id: string };
};

type UserStreamsResult = { Stream: StreamRow[] };

type PaymentRow = {
  id: string;
  amount: string;
  executedAt: string;
  txHash: string;
  stream: { id: string; streamId: string };
  recipient: { id: string };
};

type UserPaymentsResult = { Payment: PaymentRow[] };
type StreamPaymentsResult = { Payment: PaymentRow[] };

export function useAnalyticsApollo() {
  return useQuery<AnalyticsResult>(ANALYTICS_QUERY, { fetchPolicy: "cache-and-network" });
}

export function useUserStreamsApollo(addressLower?: string) {
  return useQuery<UserStreamsResult>(USER_STREAMS_QUERY, {
    variables: addressLower ? { address: addressLower } : undefined,
    skip: !addressLower,
    fetchPolicy: "cache-and-network",
  });
}

export function useUserPaymentsApollo(addressLower?: string) {
  return useQuery<UserPaymentsResult>(USER_PAYMENTS_QUERY, {
    variables: addressLower ? { address: addressLower } : undefined,
    skip: !addressLower,
    fetchPolicy: "cache-and-network",
  });
}

export function useStreamPaymentsApollo(streamId?: string) {
  return useQuery<StreamPaymentsResult>(STREAM_PAYMENTS_QUERY, {
    variables: streamId ? { streamId } : undefined,
    skip: !streamId,
    fetchPolicy: "cache-and-network",
  });
}

