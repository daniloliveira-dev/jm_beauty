import { AuthController } from "../controllers/AuthController.js";
import { ServiceController } from "../controllers/ServiceController.js";
import { UserController } from "../controllers/UserController.js";
import { ProfessionalController } from "../controllers/ProfessionalController.js";
import { CustomerController } from "../controllers/CustomerController.js";
import { AppointmentController } from "../controllers/AppointmentController.js";
import { PaymentController } from "../controllers/PaymentController.js";
import { CashController } from "../controllers/CashController.js";
import { ReportController } from "../controllers/ReportController.js";
import { SettingsController } from "../controllers/SettingsController.js";
import { ProductController } from "../controllers/ProductController.js";
import { OrderController } from "../controllers/OrderController.js";
import { OperationsController } from "../controllers/OperationsController.js";
import { PasswordResetRepository } from "../repositories/PasswordResetRepository.js";
import { RefreshTokenRepository } from "../repositories/RefreshTokenRepository.js";
import { ServiceRepository } from "../repositories/ServiceRepository.js";
import { ProfessionalRepository } from "../repositories/ProfessionalRepository.js";
import { CustomerRepository } from "../repositories/CustomerRepository.js";
import { AppointmentRepository } from "../repositories/AppointmentRepository.js";
import { PaymentRepository } from "../repositories/PaymentRepository.js";
import { CashRepository } from "../repositories/CashRepository.js";
import { ReportRepository } from "../repositories/ReportRepository.js";
import { SettingsRepository } from "../repositories/SettingsRepository.js";
import { OrderRepository } from "../repositories/OrderRepository.js";
import { OperationsRepository } from "../repositories/OperationsRepository.js";
import { UserRepository } from "../repositories/UserRepository.js";
import { AuthService } from "../services/AuthService.js";
import { LoginUseCase } from "../useCases/auth/LoginUseCase.js";
import { LogoutUseCase } from "../useCases/auth/LogoutUseCase.js";
import { RefreshSessionUseCase } from "../useCases/auth/RefreshSessionUseCase.js";
import { RegisterUserUseCase } from "../useCases/auth/RegisterUserUseCase.js";
import { CreateManagedUserUseCase } from "../useCases/users/CreateManagedUserUseCase.js";
import { DeleteUserUseCase } from "../useCases/users/DeleteUserUseCase.js";
import { GetCurrentUserUseCase } from "../useCases/users/GetCurrentUserUseCase.js";
import { ListUsersUseCase } from "../useCases/users/ListUsersUseCase.js";
import { UpdateProfileUseCase } from "../useCases/users/UpdateProfileUseCase.js";
import { UpdateUserAccessUseCase } from "../useCases/users/UpdateUserAccessUseCase.js";
import { CreateServiceUseCase } from "../useCases/services/CreateServiceUseCase.js";
import { ListServicesUseCase } from "../useCases/services/ListServicesUseCase.js";
import { UpdateServiceUseCase } from "../useCases/services/UpdateServiceUseCase.js";
import { ListProfessionalsUseCase } from "../useCases/professionals/ListProfessionalsUseCase.js";
import { SaveProfessionalUseCase } from "../useCases/professionals/SaveProfessionalUseCase.js";
import { ListCustomersUseCase } from "../useCases/customers/ListCustomersUseCase.js";
import { CreateCustomerUseCase } from "../useCases/customers/CreateCustomerUseCase.js";
import { UpdateCustomerUseCase } from "../useCases/customers/UpdateCustomerUseCase.js";
import { CreateAppointmentUseCase } from "../useCases/appointments/CreateAppointmentUseCase.js";
import { ListAppointmentsUseCase } from "../useCases/appointments/ListAppointmentsUseCase.js";
import { GetAvailabilityUseCase } from "../useCases/appointments/GetAvailabilityUseCase.js";
import { CancelAppointmentUseCase } from "../useCases/appointments/CancelAppointmentUseCase.js";
import { RescheduleAppointmentUseCase } from "../useCases/appointments/RescheduleAppointmentUseCase.js";
import { UpdateAppointmentStatusUseCase } from "../useCases/appointments/UpdateAppointmentStatusUseCase.js";
import { RecordPaymentUseCase } from "../useCases/payments/RecordPaymentUseCase.js";
import { RefundPaymentUseCase } from "../useCases/payments/RefundPaymentUseCase.js";
import { ListCashUseCase } from "../useCases/cash/ListCashUseCase.js";
import { OpenCashUseCase } from "../useCases/cash/OpenCashUseCase.js";
import { CloseCashUseCase } from "../useCases/cash/CloseCashUseCase.js";
import { ReconcileCashUseCase } from "../useCases/cash/ReconcileCashUseCase.js";
import { ListExpensesUseCase } from "../useCases/cash/ListExpensesUseCase.js";
import { CreateExpenseUseCase } from "../useCases/cash/CreateExpenseUseCase.js";
import { GetReportUseCase } from "../useCases/reports/GetReportUseCase.js";
import { GetSettingsUseCase } from "../useCases/settings/GetSettingsUseCase.js";
import { UpdateSettingsUseCase } from "../useCases/settings/UpdateSettingsUseCase.js";
import { ManageBusinessHoursUseCase } from "../useCases/settings/ManageBusinessHoursUseCase.js";
import { ManageProductsUseCase } from "../useCases/services/ManageProductsUseCase.js";
import { ManageOrderUseCase } from "../useCases/appointments/ManageOrderUseCase.js";
import { ManageSalonOperationsUseCase } from "../useCases/operations/ManageSalonOperationsUseCase.js";
import { RequestPasswordResetUseCase } from "../useCases/auth/RequestPasswordResetUseCase.js";
import { ResetPasswordUseCase } from "../useCases/auth/ResetPasswordUseCase.js";
import { PasswordRecoveryService } from "../services/PasswordRecoveryService.js";
import { PasswordService } from "../utils/password.js";
import { TokenService } from "../utils/jwt.js";
export function buildControllers() {
    const users = new UserRepository();
    const refreshTokens = new RefreshTokenRepository();
    const passwordResets = new PasswordResetRepository();
    const services = new ServiceRepository();
    const professionals = new ProfessionalRepository();
    const customers = new CustomerRepository();
    const appointments = new AppointmentRepository();
    const payments = new PaymentRepository();
    const cash = new CashRepository();
    const reports = new ReportRepository();
    const settings = new SettingsRepository();
    const orders = new OrderRepository();
    const operations = new OperationsRepository();
    const passwords = new PasswordService();
    const tokens = new TokenService();
    const auth = new AuthService(tokens, refreshTokens);
    const currentUser = new GetCurrentUserUseCase(users);
    return {
        auth: new AuthController(new RegisterUserUseCase(users, passwords, auth), new LoginUseCase(users, passwords, auth), new RefreshSessionUseCase(users, refreshTokens, tokens, auth), new LogoutUseCase(refreshTokens, tokens), currentUser, new RequestPasswordResetUseCase(users, passwordResets, new PasswordRecoveryService()), new ResetPasswordUseCase(passwordResets, passwords)),
        users: new UserController(currentUser, new UpdateProfileUseCase(users), new ListUsersUseCase(users), new CreateManagedUserUseCase(users, passwords), new UpdateUserAccessUseCase(users), new DeleteUserUseCase(users)),
        services: new ServiceController(new ListServicesUseCase(services), new CreateServiceUseCase(services), new UpdateServiceUseCase(services)),
        professionals: new ProfessionalController(new ListProfessionalsUseCase(professionals), new SaveProfessionalUseCase(professionals)),
        customers: new CustomerController(new ListCustomersUseCase(customers), new CreateCustomerUseCase(customers), new UpdateCustomerUseCase(customers)),
        appointments: new AppointmentController(new CreateAppointmentUseCase(appointments), new ListAppointmentsUseCase(appointments), new GetAvailabilityUseCase(appointments), new CancelAppointmentUseCase(appointments), new RescheduleAppointmentUseCase(appointments), new UpdateAppointmentStatusUseCase(appointments)),
        payments: new PaymentController(new RecordPaymentUseCase(payments), new RefundPaymentUseCase(payments)),
        cash: new CashController(new ListCashUseCase(cash), new OpenCashUseCase(cash), new CloseCashUseCase(cash), new ReconcileCashUseCase(cash), new ListExpensesUseCase(cash), new CreateExpenseUseCase(cash)),
        reports: new ReportController(new GetReportUseCase(reports)),
        settings: new SettingsController(new GetSettingsUseCase(settings), new UpdateSettingsUseCase(settings), new ManageBusinessHoursUseCase(settings)),
        products: new ProductController(new ManageProductsUseCase(orders)),
        orders: new OrderController(new ManageOrderUseCase(orders)),
        operations: new OperationsController(new ManageSalonOperationsUseCase(operations)),
    };
}
