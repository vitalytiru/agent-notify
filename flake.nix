{
  description = "agent-notify: Telegram + Hyprland notifications for claude-code, codex and opencode";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      lib = nixpkgs.lib;
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = lib.genAttrs systems;
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = self.packages.${system}.agent-notify;
          agent-notify = pkgs.stdenv.mkDerivation {
            pname = "agent-notify";
            version = "0.3.2";
            dontUnpack = true;
            nativeBuildInputs = [ pkgs.makeWrapper ];
            installPhase = ''
              runHook preInstall

              install -Dm755 ${./bin/agent-notify} $out/bin/agent-notify
              install -Dm755 ${./bin/agent-notify-hook} $out/bin/agent-notify-hook
              install -Dm755 ${./bin/agent-notify-codex} $out/bin/agent-notify-codex

              wrapProgram $out/bin/agent-notify \
                --prefix PATH : ${lib.makeBinPath [
                  pkgs.curl
                  pkgs.jq
                ]}
              wrapProgram $out/bin/agent-notify-hook \
                --prefix PATH : ${lib.makeBinPath [ pkgs.jq ]}:$out/bin
              wrapProgram $out/bin/agent-notify-codex \
                --prefix PATH : ${lib.makeBinPath [ pkgs.jq ]}:$out/bin

              mkdir -p $out/claude-plugin/.claude-plugin $out/claude-plugin/hooks
              install -Dm444 ${./plugins/claude/plugin.json} $out/claude-plugin/.claude-plugin/plugin.json
              sed "s|@hook@|$out/bin/agent-notify-hook|" ${./plugins/claude/hooks.json} > $out/claude-plugin/hooks/hooks.json

              runHook postInstall
            '';
            meta = {
              mainProgram = "agent-notify";
              description = "Telegram + Hyprland notifications for AI coding agents";
              license = lib.licenses.gpl3Only;
              platforms = lib.platforms.linux;
            };
          };
        }
      );

      homeManagerModules.default = import ./modules/home-manager.nix {
        flake-packages = self.packages;
        plugin-template = ./plugins/opencode-notify.ts;
      };
      homeManagerModule = self.homeManagerModules.default;

      devShells = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.bash
              pkgs.curl
              pkgs.jq
              pkgs.shellcheck
            ];
          };
        }
      );
    };
}
