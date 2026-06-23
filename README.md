# TLGM Bot

Bot de Discord para gerenciar filas de desejo de itens de Throne and Liberty usando Google Sheets como base de dados.

Ele permite que jogadores registrem interesse em armas de Archboss e itens raros, removam os próprios registros e consultem a fila de pessoas interessadas em cada item. As respostas no Discord usam embeds e, quando existe imagem local do item, exibem a miniatura ao lado do nome.

## O que a aplicação faz

- Registra uma arma de Archboss por jogador.
- Registra itens raros por jogador, respeitando os limites configurados:
  - 1 armadura rara.
  - 3 acessórios raros.
- Remove registros feitos pelo próprio jogador.
- Lista os registros de Archboss do jogador.
- Mostra a fila de jogadores interessados em uma arma ou item raro.
- Usa autocomplete nos comandos para facilitar a escolha dos itens.
- Exibe embeds mais organizados no Discord, com imagem local do item quando disponível.
- Restringe o uso dos comandos ao canal configurado.
- Salva os dados em abas do Google Sheets.
- Cria e ajusta automaticamente cabeçalhos e formatação das abas usadas.
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

## Google Sheets

A aplicação usa duas abas:

| Aba | Colunas |
| --- | --- |
| `LISTA DESEJO ARCH` | `Data`, `Nick`, `Arma`, `DiscordUserId` |
| `LISTA DESEJO ITEM RARO` | `Data`, `Nick`, `Item`, `DiscordUserId` |

O bot autentica com uma conta de serviço do Google e usa o ID da planilha informado no `.env`.

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
GUILD_ID=id_do_servidor
SHEET_ID=id_da_planilha_google
GOOGLE_CREDS_B64=json_da_conta_de_servico_em_base64
```

`GOOGLE_CREDS_B64` deve ser o JSON da conta de serviço convertido para base64.

## Como rodar

Instale as dependências:

```bash
npm install
```

Registre os comandos no servidor:

```bash
npm run register
```

Inicie o bot:

```bash
npm start
```

Valide a sintaxe do projeto:

```bash
npm test
```

## Estrutura principal

| Caminho | Responsabilidade |
| --- | --- |
| `index.js` | Inicializa o bot, autentica no Discord e roteia interações. |
| `register-commands.js` | Registra os slash commands no servidor. |
| `src/commands.js` | Define os comandos disponíveis. |
| `src/handlers/` | Implementa a lógica de cada comando. |
| `src/sheets.js` | Lida com autenticação, leitura e escrita no Google Sheets. |
| `src/responses.js` | Monta respostas e embeds enviados no Discord. |
| `src/items.js` | Lista armas, itens raros e regras de limite. |
| `src/item-assets.js` | Resolve nomes e imagens locais dos itens. |
| `src/config.js` | Centraliza configurações de ambiente e canal permitido. |

## Observações

- As respostas dos comandos são privadas para quem executou o comando.
- O canal permitido atualmente é `🎢planilha-arch-boss`.
- Armas raras de mundo foram removidas da lista de itens raros.
