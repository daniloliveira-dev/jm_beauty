export class ListServicesUseCase {
    services;
    constructor(services) {
        this.services = services;
    }
    execute(input) {
        return this.services.list({
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            search: input.search,
            includeInactive: input.role !== "USER",
        });
    }
}
