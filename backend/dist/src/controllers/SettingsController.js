import { businessHoursSchema, settingsUpdateSchema } from "../dtos/settings/settings.dto.js";
export class SettingsController {
    getSettings;
    updateSettings;
    businessHours;
    constructor(getSettings, updateSettings, businessHours) {
        this.getSettings = getSettings;
        this.updateSettings = updateSettings;
        this.businessHours = businessHours;
    }
    get = async (_req, res) => {
        res.json(await this.getSettings.execute());
    };
    update = async (req, res) => {
        const input = settingsUpdateSchema.parse(req.body);
        res.json(await this.updateSettings.execute(input));
    };
    listHours = async (_req, res) => {
        res.json(await this.businessHours.list());
    };
    updateHours = async (req, res) => {
        const input = businessHoursSchema.parse(req.body);
        res.json(await this.businessHours.update(input));
    };
}
