# TLGM Bot

Bot de Discord para gerenciar filas de desejo de itens de Throne and Liberty.
Ele usa PostgreSQL como base de dados, com estrutura preparada para múltiplas
guilds e painel web.

Ele permite que jogadores registrem interesse em armas de Archboss e itens raros, removam os próprios registros e consultem a fila de pessoas interessadas em cada item. As respostas no Discord usam embeds e, quando existe imagem local do item, exibem a miniatura ao lado do nome.

O painel web fica em `web/` e usa Next.js, Tailwind e componentes no estilo
shadcn/ui para administradores configurarem o bot por guild usando login com
Discord.

## O que a aplicação faz

- Registra uma arma de Archboss por jogador.
- Registra itens raros por jogador, respeitando os limites configurados:
  - 1 equipamento T3/T4.
  - 3 acessórios/joias.
  - 1 arma Boss Mundo T4.
  - 1 núcleo.
- Remove registros feitos pelo próprio jogador.
- Lista os registros de Archboss do jogador.
- Mostra botões para remover itens diretamente em `/meus_itens`.
- Mostra a fila de jogadores interessados em uma arma ou item raro.
- Permite que membros com cargo `ADM` marquem itens como entregues.
- Usa autocomplete nos comandos para facilitar a escolha dos itens.
- O autocomplete aceita busca sem acento, em português ou inglês, e por termos parciais.
- Exibe embeds mais organizados no Discord, com imagem local do item quando disponível.
- Restringe o uso dos comandos ao canal configurado.
- Salva os dados em PostgreSQL.
- Possui painel web com login Discord OAuth para configurar guilds.
- Permite configurar canal permitido, cargos administradores, limites por categoria e itens habilitados.
- Permite gerenciar categorias e itens por guild: adicionar, editar, desativar, remover e ordenar.
- Exibe filas, histórico de entregas, exportação CSV e status da assinatura no painel.
- Registra comandos executados em `logs/commands.log`.
- Registra alterações de loot em `logs/loot-history.log`.
- Registra consultas de fila Archboss em `logs/queue-views.log`.

## Comandos

| Comando | Descrição |
| --- | --- |
| `/weapon_arch` ou `/arma_arch` | Registra uma arma de Archboss na lista de desejo. |
| `/list_arch` ou `/listar_arch` | Lista seus registros de Archboss. |
| `/remove_arch` ou `/remover_arch` | Remove sua arma de Archboss registrada. |
| `/arch_queue` ou `/fila_arch` | Mostra a fila de jogadores para uma arma de Archboss. |
| `/rare_item` ou `/item_raro` | Registra um item raro na lista de desejo. |
| `/remove_rare_item` ou `/remover_item_raro` | Remove um item raro registrado. |
| `/rare_item_queue` ou `/fila_item_raro` | Mostra a fila de jogadores para um item raro. |
| `/marcar_entregue` | Marca um item como entregue, remove da fila ativa e grava no histórico. Requer cargo `ADM`. |
| `/my_items` ou `/meus_itens` | Mostra sua arma Archboss e seus itens raros. |
| `/help` ou `/ajuda` | Mostra regras resumidas e a lista de comandos. |
| `/baixar_logs` | Envia os arquivos de log em resposta privada para administradores. |

## Persistência

A aplicação salva as filas, entregas, guilds e assinaturas em PostgreSQL. As
tabelas são criadas pelas migrações em `db/migrations/`.

| Tabela | Conteúdo |
| --- | --- |
| `guilds` | Servidores/clientes do bot |
| `guild_settings` | Configurações por guild |
| `players` | Jogadores vinculados a uma guild |
| `wishlist_entries` | Registros ativos ou removidos da lista de desejos |
| `deliveries` | Histórico de itens entregues |
| `audit_logs` | Auditoria para ações administrativas futuras |
| `subscriptions` | Plano e status comercial da guild |
| `item_categories` | Categorias configuráveis de itens por guild |
| `guild_items` | Catálogo de armas e itens raros por guild |

## Logs de auditoria

Os logs são criados automaticamente na pasta `logs/` quando o bot registra o
primeiro evento. Cada linha é um JSON independente para facilitar filtros e
importação.

| Arquivo | Conteúdo |
| --- | --- |
| `logs/commands.log` | Comandos, botões, seleções e formulários processados pelo bot. |
| `logs/loot-history.log` | Adições e remoções bem-sucedidas de armas Archboss e itens raros. |
| `logs/queue-views.log` | Usuários que consultaram filas de armas Archboss. |

## Imagens dos itens

As imagens ficam em `assets/items`.

O nome do arquivo deve usar lowercase e hífen no lugar de espaços, baseado no nome em inglês do item. Exemplos:

- `cordy-greatsword.webp`
- `belandir-crossbow.webp`
- `brooch-of-certainty.webp`
- `necklace-of-dawns-light.webp`

O bot primeiro verifica os nomes configurados em `src/item-assets.js`. Se não existir uma regra explícita, ele tenta encontrar automaticamente o arquivo usando o slug do nome do item.

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DISCORD_TOKEN=token_do_bot
DISCORD_CLIENT_ID=id_da_aplicacao_discord
DISCORD_CLIENT_SECRET=client_secret_da_aplicacao_discord
DATABASE_URL=postgres://usuario:senha@host:5432/database
APP_BASE_URL=https://sua-url-do-railway.up.railway.app
GUILD_ID=id_do_servidor_para_registro_local
ALLOWED_CHANNEL_ID=id_do_canal_permitido
ADMIN_ROLE_ID=id_do_cargo_administrador
```

Quando `GUILD_ID` estiver definido, `npm run register` registra os comandos só
na guild informada. Sem `GUILD_ID`, os comandos são registrados globalmente na
aplicação do Discord, que é o fluxo esperado para um bot vendável.

`ALLOWED_CHANNEL_ID` e `ADMIN_ROLE_ID` ainda podem ser usados como fallback. A
base PostgreSQL já possui as tabelas `guilds` e `guild_settings` para a próxima
etapa: configurar canal, cargo e regras pelo painel web.

As variáveis obrigatórias para iniciar o bot são `DISCORD_TOKEN`,
`DISCORD_CLIENT_ID` e `DATABASE_URL`.

Para usar o painel web, configure também `DISCORD_CLIENT_SECRET` e `APP_BASE_URL`
ou `DISCORD_REDIRECT_URI`. No portal de desenvolvedor do Discord, cadastre a URL
de callback:

```text
https://sua-url-do-railway.up.railway.app/oauth/callback
```

## Como rodar

Instale as dependências:

```bash
npm install
```

Crie as tabelas do PostgreSQL:

```bash
npm run db:migrate
```

Registre os comandos no servidor:

```bash
npm run register
```

Inicie o bot:

```bash
npm start
```

Rode o painel web localmente:

```bash
cd web
npm install
npm run dev
```

No painel web, use a URL pública do serviço web como `APP_BASE_URL` e cadastre o
callback no Discord:

```text
https://sua-url-do-painel/oauth/callback
```

O login lista apenas guilds nas quais o usuário autenticado tem permissão de
administrador.

Valide a sintaxe do projeto:

```bash
npm test
```

## Estrutura principal

| Caminho | Responsabilidade |
| --- | --- |
| `index.js` | Inicializa o bot, autentica no Discord e roteia interações. |
| `register-commands.js` | Registra os slash commands no servidor. |
| `db/migrations/` | Migrações SQL para o PostgreSQL. |
| `src/commands.js` | Define os comandos disponíveis. |
| `src/db.js` | Centraliza a conexão PostgreSQL. |
| `src/guild-settings.js` | Lê e grava configurações por guild. |
| `src/item-catalog.js` | Gerencia categorias e itens configuráveis por guild. |
| `src/handlers/` | Implementa a lógica de cada comando. |
| `src/wishlist-repository.js` | Repositório principal da lista de desejos. |
| `src/wishlist-repository-postgres.js` | Persistência da lista de desejos no PostgreSQL. |
| `src/web/` | Painel web, OAuth Discord, sessões e exportações. |
| `web/` | Novo painel Next.js + Tailwind + shadcn/ui. |
| `src/responses.js` | Monta respostas e embeds enviados no Discord. |
| `src/items.js` | Lista armas, itens raros e regras de limite. |
| `src/item-assets.js` | Resolve nomes e imagens locais dos itens. |
| `src/config.js` | Centraliza configurações de ambiente e canal permitido. |

## Observações

- As respostas dos comandos são privadas para quem executou o comando.
- O canal permitido atualmente é `🎢planilha-arch-boss`.
- Armas, equipamentos, joias Boss Mundo T4 e núcleos ficam disponíveis em `item_raro`; equipamentos T3/T4 compartilham o mesmo limite de 1 registro por jogador, joias T4 compartilham o limite de 3 acessórios/joias, e núcleos têm limite separado de 1 registro por jogador.
