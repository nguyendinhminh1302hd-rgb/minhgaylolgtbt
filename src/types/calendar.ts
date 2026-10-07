export type EventCategory = 'workout' | 'pomodoro' | 'competition' | 'reminder';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  category: EventCategory;
  durationMinutes?: number;
  completed?: boolean;
  notes?: string;
  createdAt: number;
}
