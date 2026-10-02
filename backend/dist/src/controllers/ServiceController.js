import { serviceInputSchema, serviceListQuerySchema } from "../dtos/services/service.dto.js";
import { paginationMeta } from "../utils/pagination.js";
const legacyService = (service) => ({ ...service, active: Number(service.active) });
export class ServiceController {
    listServices;
    createService;
    updateService;
    constructor(listServices, createService, updateService) {
        this.listServices = listServices;
        this.createService = createService;
        this.updateService = updateService;
    }
    list = async (req, res) => {
        const query = serviceListQuerySchema.parse(req.query);
        const result = await this.listServices.execute({ ...query, role: req.auth.role });
        const data = result.rows.map(legacyService);
        if (req.originalUrl.startsWith("/api/")) {
            res.json({ data, meta: paginationMeta(query.page, query.limit, result.total) });
            return;
        }
        res.json(data);
    };
    create = async (req, res) => {
        const input = serviceInputSchema.parse(req.body);
        const service = await this.createService.execute(input);
        res.status(201).json(legacyService(service));
    };
    update = async (req, res) => {
        const id = Number(req.params.id);
        const input = serviceInputSchema.parse(req.body);
        res.json(legacyService(await this.updateService.execute(id, input)));
    };
}
