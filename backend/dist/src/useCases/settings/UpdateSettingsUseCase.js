export class UpdateSettingsUseCase {
    settings;
    constructor(settings) {
        this.settings = settings;
    }
    execute(input) { return this.settings.update(input); }
}
