export function validate(schema, field = "body") {
    return (req, _res, next) => {
        const result = schema.safeParse(req[field]);
        if (!result.success)
            return next(result.error);
        if (field === "body")
            req.body = result.data;
        next();
    };
}
