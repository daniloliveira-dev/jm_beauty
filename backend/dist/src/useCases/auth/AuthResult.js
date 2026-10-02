export function publicUser(user) {
    const role = user.role.toLowerCase();
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: role === "admin" ? "admin" : role === "operator" ? "operator" : "cliente",
    };
}
export function authResult(user, accessToken, refreshToken) {
    return {
        token: accessToken,
        accessToken,
        refreshToken,
        user: publicUser(user),
    };
}
