# Product API - Frontend em Angular

Esta é a aplicação frontend para o teste técnico, desenvolvida com Angular. A aplicação consome a API de backend para listar produtos, gerir um carrinho de compras e finalizar pedidos.

## Pré-requisitos

Para executar este projeto, irá precisar de ter instalado:

- Node.js e npm (versão 18 ou superior)
- Angular CLI (instalado globalmente: `npm install -g @angular/cli`)

## Como Rodar a Aplicação

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/AlexandreSilva1608/products-app-frontend
    cd products-app-frontend
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configure a URL da API:**
    - Crie um arquivo `environment.ts` com base no arquivo `environment.ts.example`.
    - Configure a URL da API na variável `apiUrl`.


4.  **Execute a aplicação:**
    - Certifique-se de que a sua API de backend está a ser executada.
    - Inicie o servidor de desenvolvimento do Angular:
    ```bash
    ng serve
    ```
    A aplicação estará disponível em `http://localhost:4200/`.