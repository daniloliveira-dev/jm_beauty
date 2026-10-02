export class ListProfessionalsUseCase {
    professionals;
    constructor(professionals) {
        this.professionals = professionals;
    }
    execute(role) {
        return this.professionals.list(role === "USER");
    }
}
