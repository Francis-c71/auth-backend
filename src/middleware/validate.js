// validate({ body, query, params }) with Zod schemas. 
// Parsed (and coerced) values replace the originals. 
export const validate = (schemas) => (req, _res, next) => {
  try {
    for (const key of ['body', 'query', 'params']) {
      if (schemas[key]) req[key] = schemas[key].parse(req[key] ?? {});
    }
    next();
  } catch (err) {
    next(err); // ZodError is formatted in errorHandler
  }
};
