export type TrackedKey = {
  id: string;
  service_name: string;
  key_name: string;
  key_reference: string | null;
  notes: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

export type NotificationSettingsData = {
  email: string | null;
  webhook_url: string | null;
  reminder_days: number[];
  notifications_enabled: boolean;
};
