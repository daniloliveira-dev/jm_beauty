export class CreateServiceUseCase {
    services;
    constructor(services) {
        this.services = services;
    }
    execute(input) {
        return this.services.create(input);
    }
}
