import { gql } from "urql";

export const ANALYTICS_QUERY = gql`
  query Analytics {
    Analytics_by_pk(id: "global") {
      totalStreams
      activeStreams
      totalPayments
      totalPaid
      totalDeposited
      totalWithdrawn
      updatedAt
    }
  }
`;

export const USER_STREAMS_QUERY = gql`
  query UserStreams($address: String!) {
    Stream(
      where: { sender: { id: { _eq: $address } } }
      order_by: { createdAt: desc }
      limit: 100
    ) {
      id
      streamId
      active
      amountPerInterval
      interval
      lastExecuted
      totalPaid
      executionCount
      createdAt
      sender {
        id
      }
      recipient {
        id
      }
    }
  }
`;

export const USER_PAYMENTS_QUERY = gql`
  query UserPayments($address: String!) {
    Payment(
      where: { sender: { id: { _eq: $address } } }
      order_by: { executedAt: desc }
      limit: 200
    ) {
      id
      amount
      executedAt
      txHash
      stream {
        id
        streamId
      }
      recipient {
        id
      }
    }
  }
`;

export const STREAM_PAYMENTS_QUERY = gql`
  query StreamPayments($streamId: String!) {
    Payment(where: { stream: { id: { _eq: $streamId } } }, order_by: { executedAt: desc }, limit: 200) {
      id
      amount
      executedAt
      txHash
      sender {
        id
      }
      recipient {
        id
      }
      stream {
        id
        streamId
      }
    }
  }
`;

