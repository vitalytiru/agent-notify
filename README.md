# agent-notify

Уведомления в **Telegram** и **Hyprland** для AI-агентов: [Claude Code](https://code.claude.com), [Codex CLI](https://github.com/openai/codex) и [opencode](https://opencode.ai).

События:
- **work complete** — агент закончил работу
- **asking for permission** — агент ждёт разрешения на инструмент

## Как это работает

| Агент | Механизм | События |
|---|---|---|
| Claude Code | hooks в `settings.json` (`Stop`, `Notification`) | complete, permission |
| Codex CLI | `notify` в `config.toml` | complete (permission у codex в `notify` нет) |
| opencode | плагин в `~/.config/opencode/plugins/` (`session.idle`, `permission.asked`) | complete, permission |

Все интеграции зовут один диспетчер `agent-notify`, который шлёт уведомление в Hyprland (`hyprctl notify`) и/или в Telegram (Bot API).

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
| `claude.enable` | `true` | Hooks Claude Code (нужен `programs.claude-code.enable`) |
| `codex.enable` | `true` | Notify Codex (нужен `programs.codex.enable`) |
| `opencode.enable` | `true` | Плагин opencode (работает с любой установкой) |

## Разработка

```bash
direnv allow   # use flake, нужен nix-direnv
shellcheck bin/*
nix build .#agent-notify
```

## Лицензия

[GPL-3.0](LICENSE)
