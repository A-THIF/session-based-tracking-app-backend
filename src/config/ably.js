import Ably from 'ably';

export const realtime = new Ably.Rest(process.env.ABLY_API_KEY);