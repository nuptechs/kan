const express = require('express');
const { authenticate, authorize } = require('./middleware-auth');

const app = express();
app.use(express.json());

app.get('/api/clients', authenticate, authorize('clients-view'), (req, res) => {
  console.log(`Usuário ${req.user.name} acessou a lista de clientes`);
  
  res.json({
    clients: [
      { id: 1, name: 'Cliente A', email: 'clientea@example.com' },
      { id: 2, name: 'Cliente B', email: 'clienteb@example.com' },
    ],
  });
});

app.post('/api/clients', authenticate, authorize('clients-create'), (req, res) => {
  console.log(`Usuário ${req.user.name} criou um cliente`);
  
  const newClient = {
    id: Date.now(),
    ...req.body,
    createdBy: req.user.id,
  };
  
  res.status(201).json(newClient);
});

app.put('/api/clients/:id', authenticate, authorize('clients-edit'), (req, res) => {
  console.log(`Usuário ${req.user.name} editou o cliente ${req.params.id}`);
  
  res.json({
    id: req.params.id,
    ...req.body,
    updatedBy: req.user.id,
  });
});

app.delete('/api/clients/:id', authenticate, authorize('clients-delete'), (req, res) => {
  console.log(`Usuário ${req.user.name} deletou o cliente ${req.params.id}`);
  
  res.json({
    message: 'Cliente deletado com sucesso',
    deletedBy: req.user.id,
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📋 Rotas protegidas:`);
  console.log(`   GET    /api/clients (clients-view)`);
  console.log(`   POST   /api/clients (clients-create)`);
  console.log(`   PUT    /api/clients/:id (clients-edit)`);
  console.log(`   DELETE /api/clients/:id (clients-delete)`);
});
