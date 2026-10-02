export class ManageBusinessHoursUseCase {
    settings;
    constructor(settings) {
        this.settings = settings;
    }
    list() { return this.settings.listBusinessHours(); }
    update(input) { return this.settings.updateBusinessHours(input); }
}
