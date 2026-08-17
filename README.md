# agent-notify

Уведомления в **Telegram** и **Hyprland** для AI-агентов: [Claude Code](https://code.claude.com), [Codex CLI](https://github.com/openai/codex) и [opencode](https://opencode.ai).

События:
- **work complete** — агент закончил работу
- **asking for permission** — агент ждёт разрешения на инструмент

## Как это работает

| Агент | Механизм | События |
|---|---|---|
| Claude Code | personal plugin с `hooks/hooks.json` | complete (`Stop`), permission (`Notification`) |
| Codex CLI | `$CODEX_HOME/hooks.json` | complete (`Stop`), permission (`PermissionRequest`) |
| opencode | плагин в `~/.config/opencode/plugins/` (`session.idle`, `permission.asked`) | complete, permission |

Все интеграции зовут один диспетчер `agent-notify`, который шлёт уведомление в Hyprland (`hyprctl notify`) и/или в Telegram (Bot API).

Интеграции **не трогают** ваши файлы конфигурации: `~/.claude/settings.json` и `~/.codex/config.toml` остаются под вашим контролем — хуки приезжают через отдельные файлы (плагин Claude и `hooks.json` Codex).

## Установка (home-manager)

```nix
# flake.nix
{
  inputs.agent-notify.url = "github:vitalytiru/agent-notify";

  outputs = { home-manager, agent-notify, ... }: {
    homeConfigurations."user" = home-manager.lib.homeManagerConfiguration {
      modules = [
        agent-notify.homeManagerModules.default
        {
          programs.agent-notify = {
            enable = true;
            telegram.chatId = "<ваш chat id>";
          };
          # для интеграций нужны соответствующие модули home-manager:
          programs.claude-code.enable = true;
          programs.codex.enable = true;
        }
      ];
    };
  };
}
```

### Токен Telegram

Токен **не** попадает в Nix-store — скрипт читает его из файла во время выполнения:

```bash
echo 'BOT_TOKEN' > ~/.config/agent-notify/token
chmod 600 ~/.config/agent-notify/token
```

Путь можно поменять опцией `programs.agent-notify.telegram.tokenFile` (например, на секрет sops-nix/agenix).

## Опции

| Опция | По умолчанию | Описание |
|---|---|---|
| `enable` | `false` | Включить модуль |
| `telegram.enable` | `true` | Отправлять в Telegram |
| `telegram.chatId` | `""` | Chat ID (обязателен при `telegram.enable`) |
| `telegram.tokenFile` | `~/.config/agent-notify/token` | Файл с токеном бота |
| `hyprland.enable` | `true` | Показывать `hyprctl notify` (только в сессии Hyprland) |
| `hyprland.timeout` | `5000` | Таймаут уведомления, мс |
| `claude.enable` | `true` | Плагин с hooks Claude Code (нужен `programs.claude-code.enable`) |
| `codex.enable` | `true` | `hooks.json` Codex (нужен `programs.codex.enable`) |
| `opencode.enable` | `true` | Плагин opencode (работает с любой установкой) |

## Замечания

- **Claude Code**: плагин загружается как персональный (`~/.claude/skills/`); если не применится — попробуйте `/reload-plugins` в сессии claude.
- **Codex**: hooks включены по умолчанию (`features.hooks = true`). При первом запуске codex может запросить подтверждение доверия новому хуку.

## Разработка

```bash
direnv allow   # use flake, нужен nix-direnv
shellcheck bin/*
nix build .#agent-notify
```

## Лицензия

[GPL-3.0](LICENSE)
