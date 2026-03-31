import { useQuery } from "urql";
import { ANALYTICS_QUERY, STREAM_PAYMENTS_QUERY, USER_PAYMENTS_QUERY, USER_STREAMS_QUERY } from "@/services/graphql";

export function useAnalytics() {
  return useQuery({ query: ANALYTICS_QUERY });
}

export function useUserStreams(addressLower?: string) {
  return useQuery({
    query: USER_STREAMS_QUERY,
    variables: addressLower ? { address: addressLower } : undefined,
    pause: !addressLower,
  });
}

export function useUserPayments(addressLower?: string) {
  return useQuery({
    query: USER_PAYMENTS_QUERY,
    variables: addressLower ? { address: addressLower } : undefined,
    pause: !addressLower,
  });
}

export function useStreamPayments(streamId?: string) {
  return useQuery({
    query: STREAM_PAYMENTS_QUERY,
    variables: streamId ? { streamId } : undefined,
    pause: !streamId,
  });
}

