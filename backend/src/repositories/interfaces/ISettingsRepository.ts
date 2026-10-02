import type { z } from "zod";
import type { settingsUpdateSchema, businessHoursSchema } from "../../dtos/settings/settings.dto.js";

export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;
export type BusinessHoursInput = z.infer<typeof businessHoursSchema>;

export interface ISettingsRepository {
  get(): Promise<Record<string, unknown>>;
  update(input: SettingsUpdate): Promise<Record<string, unknown>>;
  listBusinessHours(): Promise<Array<Record<string, unknown>>>;
  updateBusinessHours(input: BusinessHoursInput): Promise<Array<Record<string, unknown>>>;
}
