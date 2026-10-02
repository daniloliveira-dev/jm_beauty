import type { ISettingsRepository } from "../../repositories/interfaces/ISettingsRepository.js";
export class GetSettingsUseCase {
  constructor(private readonly settings: ISettingsRepository) {}
  execute() { return this.settings.get(); }
}
