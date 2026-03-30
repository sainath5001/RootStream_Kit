import generated from "../generated/index.js";
import type {
  Analytics,
  Deposit,
  Payment,
  Stream,
  User,
  Withdrawal,
  handlerContext,
  Rootstream_StreamCreated_event,
  Rootstream_StreamCancelled_event,
  Rootstream_PaymentExecuted_event,
  Rootstream_FundsDeposited_event,
  Rootstream_FundsWithdrawn_event,
} from "../generated/src/Types.gen";

type RootstreamHandlers = typeof import("../generated/src/Handlers.gen").Rootstream;
const { Rootstream } = generated as { Rootstream: RootstreamHandlers };

const ANALYTICS_ID = "global";

function eventId(txHash: string, logIndex: number): string {
  return `${txHash}-${logIndex}`;
}

function toDateFromBlockTimestamp(ts: number): Date {
  // Envio EVM block timestamp is provided as unix seconds (number).
  return new Date(ts * 1000);
}

async function getOrCreateAnalytics(context: any, now: Date): Promise<Analytics> {
  const existing = await context.Analytics.get(ANALYTICS_ID);
  if (existing) return existing;

  const a: Analytics = {
    id: ANALYTICS_ID,
    totalStreams: 0,
    activeStreams: 0,
    totalPayments: 0,
    totalPaid: 0n,
    totalDeposited: 0n,
    totalWithdrawn: 0n,
    updatedAt: now,
  };
  context.Analytics.set(a);
  return a;
}

async function getOrCreateUser(context: any, id: string, now: Date): Promise<User> {
  const existing = await context.User.get(id);
  if (existing) return existing;

  const u: User = {
    id,
    totalStreamsCreated: 0,
    totalStreamsReceived: 0,
    totalPaidSent: 0n,
    totalPaidReceived: 0n,
    totalDeposited: 0n,
    totalWithdrawn: 0n,
    derivedBalance: 0n,
    createdAt: now,
    updatedAt: now,
  };
  context.User.set(u);
  return u;
}

Rootstream.StreamCreated.handler(
  async ({ event, context }: { event: Rootstream_StreamCreated_event; context: handlerContext }) => {
  const now = toDateFromBlockTimestamp(event.block.timestamp);

  const streamId = event.params.streamId;
  const senderId = event.params.sender;
  const recipientId = event.params.recipient;

  const [sender, recipient, analytics] = await Promise.all([
    getOrCreateUser(context, senderId, now),
    getOrCreateUser(context, recipientId, now),
    getOrCreateAnalytics(context, now),
  ]);

  const streamEntity: Stream = {
    id: streamId.toString(),
    streamId,
    sender_id: sender.id,
    recipient_id: recipient.id,
    amountPerInterval: event.params.amountPerInterval,
    interval: event.params.interval,
    lastExecuted: event.params.lastExecuted,
    active: true,
    createdAt: now,
    createdAtBlock: event.block.number,
    createdTxHash: event.transaction.hash,
    cancelledAt: undefined,
    cancelledTxHash: undefined,
    totalPaid: 0n,
    executionCount: 0,
  };
  context.Stream.set(streamEntity);

  context.User.set({
    ...sender,
    totalStreamsCreated: sender.totalStreamsCreated + 1,
    updatedAt: now,
  });

  context.User.set({
    ...recipient,
    totalStreamsReceived: recipient.totalStreamsReceived + 1,
    updatedAt: now,
  });

  context.Analytics.set({
    ...analytics,
    totalStreams: analytics.totalStreams + 1,
    activeStreams: analytics.activeStreams + 1,
    updatedAt: now,
  });
  }
);

Rootstream.StreamCancelled.handler(
  async ({ event, context }: { event: Rootstream_StreamCancelled_event; context: handlerContext }) => {
  const now = toDateFromBlockTimestamp(event.block.timestamp);
  const streamId = event.params.streamId.toString();

  const [stream, analytics] = await Promise.all([
    context.Stream.get(streamId),
    getOrCreateAnalytics(context, now),
  ]);

  if (!stream) return;
  if (!stream.active) return;

  context.Stream.set({
    ...stream,
    active: false,
    cancelledAt: now,
    cancelledTxHash: event.transaction.hash,
  });

  context.Analytics.set({
    ...analytics,
    activeStreams: Math.max(0, analytics.activeStreams - 1),
    updatedAt: now,
  });
  }
);

Rootstream.PaymentExecuted.handler(
  async ({ event, context }: { event: Rootstream_PaymentExecuted_event; context: handlerContext }) => {
  const now = toDateFromBlockTimestamp(event.block.timestamp);

  const streamIdBn = event.params.streamId;
  const streamId = streamIdBn.toString();

  const senderId = event.params.sender;
  const recipientId = event.params.recipient;
  const amount = event.params.amount;
  const executedAtUnix = event.params.timestamp;

  const [stream, sender, recipient, analytics] = await Promise.all([
    context.Stream.get(streamId),
    getOrCreateUser(context, senderId, now),
    getOrCreateUser(context, recipientId, now),
    getOrCreateAnalytics(context, now),
  ]);

  // In case the indexer starts after deployment without history, create a minimal Stream record.
  if (!stream) {
    const minimal: Stream = {
      id: streamId,
      streamId: streamIdBn,
      sender_id: sender.id,
      recipient_id: recipient.id,
      amountPerInterval: amount,
      interval: 0n,
      lastExecuted: executedAtUnix,
      active: true,
      createdAt: now,
      createdAtBlock: event.block.number,
      createdTxHash: event.transaction.hash,
      cancelledAt: undefined,
      cancelledTxHash: undefined,
      totalPaid: 0n,
      executionCount: 0,
    };
    context.Stream.set(minimal);
  }

  const currentStream: Stream = (await context.Stream.get(streamId))!;

  const payment: Payment = {
    id: eventId(event.transaction.hash, event.logIndex),
    stream_id: streamId,
    sender_id: sender.id,
    recipient_id: recipient.id,
    amount,
    executedAt: now,
    executedAtUnix,
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.logIndex,
  };
  context.Payment.set(payment);

  context.Stream.set({
    ...currentStream,
    lastExecuted: executedAtUnix,
    totalPaid: currentStream.totalPaid + amount,
    executionCount: currentStream.executionCount + 1,
  });

  context.User.set({
    ...sender,
    totalPaidSent: sender.totalPaidSent + amount,
    derivedBalance: sender.derivedBalance - amount,
    updatedAt: now,
  });

  context.User.set({
    ...recipient,
    totalPaidReceived: recipient.totalPaidReceived + amount,
    updatedAt: now,
  });

  context.Analytics.set({
    ...analytics,
    totalPayments: analytics.totalPayments + 1,
    totalPaid: analytics.totalPaid + amount,
    updatedAt: now,
  });
  }
);

Rootstream.FundsDeposited.handler(
  async ({ event, context }: { event: Rootstream_FundsDeposited_event; context: handlerContext }) => {
  const now = toDateFromBlockTimestamp(event.block.timestamp);
  const userId = event.params.user;

  const [user, analytics] = await Promise.all([
    getOrCreateUser(context, userId, now),
    getOrCreateAnalytics(context, now),
  ]);

  const deposit: Deposit = {
    id: eventId(event.transaction.hash, event.logIndex),
    user_id: user.id,
    amount: event.params.amount,
    newBalance: event.params.newBalance,
    createdAt: now,
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.logIndex,
  };
  context.Deposit.set(deposit);

  context.User.set({
    ...user,
    totalDeposited: user.totalDeposited + event.params.amount,
    derivedBalance: user.derivedBalance + event.params.amount,
    updatedAt: now,
  });

  context.Analytics.set({
    ...analytics,
    totalDeposited: analytics.totalDeposited + event.params.amount,
    updatedAt: now,
  });
  }
);

Rootstream.FundsWithdrawn.handler(
  async ({ event, context }: { event: Rootstream_FundsWithdrawn_event; context: handlerContext }) => {
  const now = toDateFromBlockTimestamp(event.block.timestamp);
  const userId = event.params.user;
  const streamId = event.params.streamId.toString();

  const [user, analytics] = await Promise.all([
    getOrCreateUser(context, userId, now),
    getOrCreateAnalytics(context, now),
  ]);

  const w: Withdrawal = {
    id: eventId(event.transaction.hash, event.logIndex),
    user_id: user.id,
    stream_id: streamId,
    amount: event.params.amount,
    createdAt: now,
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.logIndex,
  };
  context.Withdrawal.set(w);

  context.User.set({
    ...user,
    totalWithdrawn: user.totalWithdrawn + event.params.amount,
    derivedBalance: user.derivedBalance - event.params.amount,
    updatedAt: now,
  });

  context.Analytics.set({
    ...analytics,
    totalWithdrawn: analytics.totalWithdrawn + event.params.amount,
    updatedAt: now,
  });
  }
);
