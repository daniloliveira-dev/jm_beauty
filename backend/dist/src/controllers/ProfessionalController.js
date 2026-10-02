import { professionalSchema } from "../dtos/professionals/professional.dto.js";
const legacy = (professional) => ({ ...professional, active: Number(professional.active), service_ids: "serviceIds" in professional ? professional.serviceIds : [] });
export class ProfessionalController {
    listProfessionals;
    saveProfessional;
    constructor(listProfessionals, saveProfessional) {
        this.listProfessionals = listProfessionals;
        this.saveProfessional = saveProfessional;
    }
    list = async (req, res) => {
        res.json((await this.listProfessionals.execute(req.auth.role)).map(legacy));
    };
    create = async (req, res) => {
        const input = professionalSchema.parse(req.body);
        res.status(201).json(legacy(await this.saveProfessional.execute(input)));
    };
    update = async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id < 1)
            throw new Error("ID de profissional inválido.");
        const input = professionalSchema.parse(req.body);
        res.json(legacy(await this.saveProfessional.execute(input, id)));
    };
}
