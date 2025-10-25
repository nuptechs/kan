const fetch = require('node-fetch');

const IDENTITY_URL = process.env.IDENTITY_URL || 'http://localhost:5000';
const SYSTEM_ID = process.env.SYSTEM_ID || 'nup-system';

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Token não fornecido',
      message: 'Forneça um token JWT válido no header Authorization'
    });
  }
  
  try {
    const response = await fetch(`${IDENTITY_URL}/api/validate/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    
    if (!response.ok) {
      return res.status(401).json({ 
        error: 'Token inválido',
        message: 'O token fornecido não é válido ou expirou'
      });
    }
    
    const userData = await response.json();
    req.user = userData.user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Erro ao validar token:', error);
    return res.status(500).json({ 
      error: 'Erro ao validar token',
      message: 'Erro ao conectar com o servidor de autenticação'
    });
  }
}

function authorize(functionKey) {
  return async (req, res, next) => {
    const token = req.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Token não fornecido' 
      });
    }
    
    try {
      const response = await fetch(`${IDENTITY_URL}/api/validate/permission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          systemId: SYSTEM_ID,
          functionKey,
        }),
      });
      
      const result = await response.json();
      
      if (!result.allowed) {
        return res.status(403).json({
          error: 'Permissão negada',
          message: result.reason || 'Você não tem permissão para realizar esta ação',
          functionKey,
        });
      }
      
      req.permission = result.permission;
      next();
    } catch (error) {
      console.error('Erro ao validar permissão:', error);
      return res.status(500).json({ 
        error: 'Erro ao validar permissão',
        message: 'Erro ao conectar com o servidor de autorização'
      });
    }
  };
}

const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function authorizeCached(functionKey) {
  return async (req, res, next) => {
    const token = req.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    const cacheKey = `${token}:${functionKey}`;
    const cached = permissionCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      if (cached.allowed) {
        req.permission = cached.permission;
        return next();
      } else {
        return res.status(403).json({
          error: 'Permissão negada',
          message: cached.reason,
        });
      }
    }
    
    try {
      const response = await fetch(`${IDENTITY_URL}/api/validate/permission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          systemId: SYSTEM_ID,
          functionKey,
        }),
      });
      
      const result = await response.json();
      
      permissionCache.set(cacheKey, {
        allowed: result.allowed,
        permission: result.permission,
        reason: result.reason,
        timestamp: Date.now(),
      });
      
      if (!result.allowed) {
        return res.status(403).json({
          error: 'Permissão negada',
          message: result.reason,
        });
      }
      
      req.permission = result.permission;
      next();
    } catch (error) {
      console.error('Erro ao validar permissão:', error);
      return res.status(500).json({ 
        error: 'Erro ao validar permissão' 
      });
    }
  };
}

function clearPermissionCache(userId) {
  for (const [key] of permissionCache) {
    if (key.includes(userId)) {
      permissionCache.delete(key);
    }
  }
}

module.exports = {
  authenticate,
  authorize,
  authorizeCached,
  clearPermissionCache,
};
