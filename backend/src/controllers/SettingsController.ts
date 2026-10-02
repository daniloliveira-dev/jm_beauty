import type { Request, Response } from "express";
import { businessHoursSchema, settingsUpdateSchema } from "../dtos/settings/settings.dto.js";
import { GetSettingsUseCase } from "../useCases/settings/GetSettingsUseCase.js";
import { ManageBusinessHoursUseCase } from "../useCases/settings/ManageBusinessHoursUseCase.js";
import { UpdateSettingsUseCase } from "../useCases/settings/UpdateSettingsUseCase.js";

export class SettingsController {
  constructor(
    private readonly getSettings: GetSettingsUseCase,
    private readonly updateSettings: UpdateSettingsUseCase,
    private readonly businessHours: ManageBusinessHoursUseCase,
  ) {}

  get = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.getSettings.execute());
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const input = settingsUpdateSchema.parse(req.body);
    res.json(await this.updateSettings.execute(input));
  };

  listHours = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.businessHours.list());
  };

  updateHours = async (req: Request, res: Response): Promise<void> => {
    const input = businessHoursSchema.parse(req.body);
    res.json(await this.businessHours.update(input));
  };
}
