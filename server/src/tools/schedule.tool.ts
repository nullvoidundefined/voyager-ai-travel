import type {
  AddItemInput,
  ScheduleDay,
  ScheduleItem,
  UpsertDayInput,
} from 'app/repositories/trips/schedule.repository.js';

import type { ToolContext } from './executor.js';

export interface ScheduleAdapters {
  upsertScheduleDay: (
    tripId: string,
    input: UpsertDayInput,
  ) => Promise<ScheduleDay>;
  addScheduleItem: (
    scheduleId: string,
    input: AddItemInput,
  ) => Promise<ScheduleItem>;
}

interface DayInput {
  day_number: number;
  day_date: string;
  items: AddItemInput[];
}

export async function handlePlanDailySchedule(
  input: { days: DayInput[] },
  ctx: ToolContext,
  adapters: ScheduleAdapters,
) {
  for (const day of input.days) {
    const scheduleDay = await adapters.upsertScheduleDay(ctx.tripId, {
      day_date: day.day_date,
      day_number: day.day_number,
    });
    for (const item of day.items) {
      await adapters.addScheduleItem(scheduleDay.id, item);
    }
  }
  return { days_planned: input.days.length };
}
