export function toPublicUser(user) {
    const normalizedRole = user.role.toLowerCase();
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: normalizedRole === "admin" ? "admin" : normalizedRole === "operator" ? "operator" : "cliente",
        active: user.active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
