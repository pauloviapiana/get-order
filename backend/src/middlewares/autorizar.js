/**
 * RBAC por perfil. Usar depois de `autenticar`:
 *   router.get('/usuarios', autenticar, autorizarPerfil('admin'), listar)
 *
 * 401 = sem login (autenticar) · 403 = logado, mas perfil sem permissão (aqui)
 */
export function autorizarPerfil(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario?.perfil) {
      return res.status(401).json({ erro: 'Usuário não autenticado' });
    }

    if (!perfisPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({ erro: 'Acesso negado para este perfil' });
    }

    return next();
  };
}
