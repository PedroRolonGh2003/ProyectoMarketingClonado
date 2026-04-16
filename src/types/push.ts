export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionBody {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export interface PushSubscriptionRequest {
  usuarioId: number;
  subscription: PushSubscriptionBody;
}

export interface PushTestRequest {
  idUsuario: number;
  title?: string;
  body?: string;
  url?: string;
}
