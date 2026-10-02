export class GetSettingsUseCase {
    settings;
    constructor(settings) {
        this.settings = settings;
    }
    execute() { return this.settings.get(); }
}
