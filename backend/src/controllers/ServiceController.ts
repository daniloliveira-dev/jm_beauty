import type { Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { serviceInputSchema, serviceListQuerySchema } from "../dtos/services/service.dto.js";
import { paginationMeta } from "../utils/pagination.js";
import { CreateServiceUseCase } from "../useCases/services/CreateServiceUseCase.js";
import { ListServicesUseCase } from "../useCases/services/ListServicesUseCase.js";
import { UpdateServiceUseCase } from "../useCases/services/UpdateServiceUseCase.js";
import { DeleteServiceUseCase } from "../useCases/services/DeleteServiceUseCase.js";

const legacyService = <T extends { active: boolean }>(service: T) => ({ ...service, active: Number(service.active) });

export class ServiceController {
  constructor(
    private readonly listServices: ListServicesUseCase,
    private readonly createService: CreateServiceUseCase,
    private readonly updateService: UpdateServiceUseCase,
    private readonly deleteService: DeleteServiceUseCase,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = serviceListQuerySchema.parse(req.query);
    const result = await this.listServices.execute({ ...query, role: req.auth!.role as UserRole });
    const data = result.rows.map(legacyService);
    if (req.originalUrl.startsWith("/api/")) {
      res.json({ data, meta: paginationMeta(query.page, query.limit, result.total) });
      return;
    }
    res.json(data);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const input = serviceInputSchema.parse(req.body);
    const service = await this.createService.execute(input);
    res.status(201).json(legacyService(service));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const input = serviceInputSchema.parse(req.body);
    res.json(legacyService(await this.updateService.execute(id, input)));
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID de serviço inválido.");
    res.json(await this.deleteService.execute(id));
  };
}
