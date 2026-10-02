import type { SettingsUpdate, ISettingsRepository } from "../../repositories/interfaces/ISettingsRepository.js";
export class UpdateSettingsUseCase {
  constructor(private readonly settings: ISettingsRepository) {}
  execute(input: SettingsUpdate) { return this.settings.update(input); }
}
