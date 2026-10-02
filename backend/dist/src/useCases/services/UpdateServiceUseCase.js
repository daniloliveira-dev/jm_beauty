import { NotFoundError } from "../../exceptions/DomainErrors.js";
export class UpdateServiceUseCase {
    services;
    constructor(services) {
        this.services = services;
    }
    async execute(id, input) {
        if (!(await this.services.findById(id)))
            throw new NotFoundError("Serviço não encontrado.");
        return this.services.update(id, input);
    }
}
