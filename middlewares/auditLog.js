import AuditLog from '../models/AuditLog.js';

/**
 * Audit middleware factory - logs admin mutations (POST/PUT/PATCH/DELETE)
 * Wraps res.json to fire-and-forget log creation on successful responses
 */
export const auditMiddleware = (action, resource) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (data) => {
      // Only log successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300 && data?.success !== false) {
        // Fire-and-forget: don't await, don't block response
        AuditLog.create({
          adminId: req.userId,
          action,
          resource,
          resourceId: req.params[Object.keys(req.params)[0]] || undefined,
          details: {
            method: req.method,
            body: req.body,
            params: req.params
          },
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('User-Agent')
        }).catch(err => {
          console.error('Audit log creation failed:', err.message);
        });
      }

      return originalJson(data);
    };

    next();
  };
};

export default auditMiddleware;
