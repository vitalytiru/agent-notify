{ flake-packages, plugin-template }:
{
  config,
  lib,
  pkgs,
  ...
}:
let
  cfg = config.programs.agent-notify;
  system = pkgs.stdenv.hostPlatform.system;
  bin = "${cfg.package}/bin";
in
{
  options.programs.agent-notify = {
    enable = lib.mkEnableOption "agent-notify: Telegram + Hyprland notifications for AI coding agents (claude-code, codex, opencode)";

    package = lib.mkOption {
      type = lib.types.package;
      default = flake-packages.${system}.agent-notify;
      defaultText = lib.literalExpression "agent-notify.packages.<system>.agent-notify";
      description = "The agent-notify package to use.";
    };

    telegram = {
      enable = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Send notifications to Telegram.";
      };
      chatId = lib.mkOption {
        type = lib.types.str;
        default = "";
        description = "Telegram chat ID. Required when telegram is enabled.";
      };
      tokenFile = lib.mkOption {
        type = lib.types.str;
        default = "${config.xdg.configHome}/agent-notify/token";
        defaultText = lib.literalExpression "\"\${config.xdg.configHome}/agent-notify/token\"";
        description = ''
          Path to a file (chmod 600) containing the Telegram bot token.
          The file is read at runtime, so the token never ends up in the Nix store.
        '';
      };
    };

    hyprland = {
      enable = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Show notifications via hyprctl notify (only fires inside a Hyprland session).";
      };
      timeout = lib.mkOption {
        type = lib.types.int;
        default = 5000;
        description = "Hyprland notification timeout in milliseconds.";
      };
    };

    claude.enable = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = ''
        Install Claude Code hooks as a personal plugin (Stop = work complete,
        Notification = permission prompt). Does not touch `~/.claude/settings.json`.
        Requires `programs.claude-code.enable = true` (home-manager module).
      '';
    };

    codex.enable = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = ''
        Write codex lifecycle hooks to `$CODEX_HOME/hooks.json`
        (Stop = work complete, PermissionRequest = permission prompt).
        Does not touch the user-managed `config.toml`.
        Requires `programs.codex.enable = true` (home-manager module).
      '';
    };

    codex.permission = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = ''
        Also notify on codex PermissionRequest events. Off by default:
        codex fires them for every approval action, including auto-approved
        tool calls, which is noisy.
      '';
    };

    opencode.enable = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = ''
        Install the opencode plugin (session.idle = work complete, permission.asked = permission prompt)
        into `~/.config/opencode/plugins/`. Works with any opencode installation.
      '';
    };
  };

  config = lib.mkIf cfg.enable {
    assertions = [
      {
        assertion = !cfg.claude.enable || (config.programs ? claude-code && config.programs.claude-code.enable);
        message = "programs.agent-notify.claude.enable requires programs.claude-code.enable = true (or set programs.agent-notify.claude.enable = false).";
      }
      {
        assertion = !cfg.codex.enable || (config.programs ? codex && config.programs.codex.enable);
        message = "programs.agent-notify.codex.enable requires programs.codex.enable = true (or set programs.agent-notify.codex.enable = false).";
      }
      {
        assertion = !cfg.telegram.enable || cfg.telegram.chatId != "";
        message = "programs.agent-notify.telegram.chatId must be set when telegram is enabled.";
      }
    ];

    home.packages = [ cfg.package ];

    xdg.configFile."agent-notify/config".text = ''
      TELEGRAM_ENABLED=${if cfg.telegram.enable then "1" else "0"}
      TELEGRAM_CHAT_ID=${cfg.telegram.chatId}
      TELEGRAM_TOKEN_FILE=${cfg.telegram.tokenFile}
      HYPRLAND_ENABLED=${if cfg.hyprland.enable then "1" else "0"}
      HYPRLAND_TIME=${toString cfg.hyprland.timeout}
    '';

    programs.claude-code.plugins.agent-notify = lib.mkIf cfg.claude.enable "${cfg.package}/claude-plugin";

    programs.codex.hooks = lib.mkIf cfg.codex.enable ({
      Stop = [
        {
          hooks = [
            {
              type = "command";
              command = "${bin}/agent-notify-hook codex complete";
              timeout = 15;
            }
          ];
        }
      ];
    } // lib.optionalAttrs cfg.codex.permission {
      PermissionRequest = [
        {
          hooks = [
            {
              type = "command";
              command = "${bin}/agent-notify-hook codex permission";
              timeout = 15;
            }
          ];
        }
      ];
    });

    xdg.configFile."opencode/plugins/agent-notify.ts" = lib.mkIf cfg.opencode.enable {
      text = lib.replaceStrings
        [ "@agent-notify@" ]
        [ "${bin}/agent-notify" ]
        (builtins.readFile plugin-template);
    };
  };
}
