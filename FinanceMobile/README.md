# Finance Mobile

Aplicativo móvel para gerenciamento financeiro que consome uma API hospedada na Azure.

## Funcionalidades

- Autenticação de usuários (login/logout)
- Integração com API Azure
- Interface amigável e responsiva

## Tecnologias Utilizadas

- React Native
- Expo
- React Navigation
- Axios para requisições HTTP
- AsyncStorage para armazenamento local

## Pré-requisitos

- Node.js (versão 14 ou superior)
- npm ou yarn
- Expo CLI

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/FinanceMobile.git
cd FinanceMobile
```

2. Instale as dependências:
```bash
npm install
# ou
yarn install
```

3. Configure a URL da API:
Abra o arquivo `services/api.ts` e substitua a URL da API pela URL real da sua API Azure.

## Executando o Projeto

```bash
npm start
# ou
yarn start
```

Isso iniciará o servidor de desenvolvimento do Expo. Você pode executar o aplicativo em um emulador ou em seu dispositivo físico usando o aplicativo Expo Go.

## Estrutura do Projeto

- `/app` - Contém as telas da aplicação
  - `/auth` - Telas de autenticação (login, registro)
  - `/(tabs)` - Telas principais do aplicativo
- `/components` - Componentes reutilizáveis
- `/services` - Serviços para comunicação com a API
- `/assets` - Recursos estáticos (imagens, fontes)
- `/hooks` - Hooks personalizados
- `/constants` - Constantes e configurações

## Configuração da API

O aplicativo está configurado para se comunicar com uma API hospedada na Azure. Certifique-se de que sua API tenha os seguintes endpoints:

- `/auth/login` - Para autenticação de usuários
- `/auth/logout` - Para logout de usuários
- `/auth/register` - Para registro de novos usuários

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova feature'`)
4. Faça push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request
