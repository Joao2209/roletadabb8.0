# Roleta Premium PIX (HTML + API mínima)

Site HTML simples para gerar PIX pela Sync Pay. A confirmação e liberação são feitas manualmente por você.

## Estrutura

```
/roleta
  index.html
  styles.css
  app.js
  server.js
  paymentService.js
  package.json
  .env
```

## Rodar localmente

1) Instalar dependências

```
npm install
```

2) Configurar ambiente

```
cp .env.example .env
```

Preencha suas credenciais da Sync Pay no `.env`.

3) Iniciar API

```
npm run dev
```

4) Abrir o site

Abra `index.html` no navegador.

No campo de URL da API, use `http://localhost:4000`.

## Endpoints

- `POST /api/payments/deposit`
- `POST /api/payments/syncpay/webhook`
- `GET /health`

## Observações

- Não há banco de dados.
- O crédito/liberação é manual após confirmação do pagamento.