import type { BusinessHoursInput, ISettingsRepository } from "../../repositories/interfaces/ISettingsRepository.js";
export class ManageBusinessHoursUseCase {
  constructor(private readonly settings: ISettingsRepository) {}
  list() { return this.settings.listBusinessHours(); }
  update(input: BusinessHoursInput) { return this.settings.updateBusinessHours(input); }
}
