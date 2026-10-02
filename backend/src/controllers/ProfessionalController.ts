import type { Request, Response } from "express";
import { professionalSchema } from "../dtos/professionals/professional.dto.js";
import { ListProfessionalsUseCase } from "../useCases/professionals/ListProfessionalsUseCase.js";
import { SaveProfessionalUseCase } from "../useCases/professionals/SaveProfessionalUseCase.js";
import { DeleteProfessionalUseCase } from "../useCases/professionals/DeleteProfessionalUseCase.js";

const legacy = <T extends { active: boolean }>(professional: T) => ({ ...professional, active: Number(professional.active), service_ids: "serviceIds" in professional ? professional.serviceIds : [] });

export class ProfessionalController {
  constructor(
    private readonly listProfessionals: ListProfessionalsUseCase,
    private readonly saveProfessional: SaveProfessionalUseCase,
    private readonly deleteProfessional: DeleteProfessionalUseCase,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    res.json((await this.listProfessionals.execute(req.auth!.role)).map(legacy));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const input = professionalSchema.parse(req.body);
    res.status(201).json(legacy(await this.saveProfessional.execute(input)));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID de profissional inválido.");
    const input = professionalSchema.parse(req.body);
    res.json(legacy(await this.saveProfessional.execute(input, id)));
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    res.json(await this.deleteProfessional.execute(id));
  };
}
