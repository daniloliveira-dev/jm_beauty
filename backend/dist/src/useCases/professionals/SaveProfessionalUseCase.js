export class SaveProfessionalUseCase {
    professionals;
    constructor(professionals) {
        this.professionals = professionals;
    }
    execute(input, id) {
        return this.professionals.save(input, id);
    }
}
