#!/usr/bin/env bash
set -euo pipefail
command -v node >/dev/null || { echo "Install Node.js 22.12+ first." >&2; exit 1; }
node -e 'const [a,b]=process.versions.node.split(".").map(Number);if(a<22||(a===22&&b<12)){console.error("Node.js 22.12+ required");process.exit(1)}'
command -v git >/dev/null || { echo "Install Git first." >&2; exit 1; }
TASK_UI_DATA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}"
TASK_UI_INSTALL_DIR="${TASK_UI_INSTALL_DIR:-$TASK_UI_DATA_DIR/solotask}"
# Reuse an earlier installation (VibeBoard or Task Master UI) and its cache when upgrading.
for TASK_UI_OLD in vibeboard task-master-ui; do
  if [ ! -e "$TASK_UI_INSTALL_DIR" ] && [ -d "$TASK_UI_DATA_DIR/$TASK_UI_OLD/.git" ]; then
    TASK_UI_INSTALL_DIR="$TASK_UI_DATA_DIR/$TASK_UI_OLD"
  fi
done
TASK_UI_BIN_DIR="${TASK_UI_BIN_DIR:-$HOME/.local/bin}"
if [ -d "$TASK_UI_INSTALL_DIR/.git" ]; then
  TASK_UI_REMOTE="$(git -C "$TASK_UI_INSTALL_DIR" remote get-url origin)"
  case "$TASK_UI_REMOTE" in
    https://github.com/aemal/task-master-ui.git|https://github.com/aemal/vibeboard.git)
      git -C "$TASK_UI_INSTALL_DIR" remote set-url origin https://github.com/aemal/solotask.git ;;
  esac
  git -C "$TASK_UI_INSTALL_DIR" pull --ff-only
elif [ -e "$TASK_UI_INSTALL_DIR" ]; then
  echo "Installation directory exists and is not a git checkout: $TASK_UI_INSTALL_DIR" >&2
  exit 1
else
  git clone https://github.com/aemal/solotask.git "$TASK_UI_INSTALL_DIR"
fi
(cd "$TASK_UI_INSTALL_DIR" && npm install && npm run build)
mkdir -p "$TASK_UI_BIN_DIR"
for TASK_UI_COMMAND in solotask vibeboard task-master-ui; do
  if [ -L "$TASK_UI_BIN_DIR/$TASK_UI_COMMAND" ]; then
    TASK_UI_LINK_TARGET="$(readlink "$TASK_UI_BIN_DIR/$TASK_UI_COMMAND")"
    if [ "$TASK_UI_LINK_TARGET" != "$TASK_UI_INSTALL_DIR/bin/vibeboard.mjs" ] && [ "$TASK_UI_LINK_TARGET" != "$TASK_UI_INSTALL_DIR/bin/task-master-ui.mjs" ]; then
      echo "Refusing to replace another installation's command: $TASK_UI_BIN_DIR/$TASK_UI_COMMAND" >&2
      exit 1
    fi
  fi
  if [ -e "$TASK_UI_BIN_DIR/$TASK_UI_COMMAND" ] && [ ! -L "$TASK_UI_BIN_DIR/$TASK_UI_COMMAND" ]; then
    echo "Refusing to replace existing command: $TASK_UI_BIN_DIR/$TASK_UI_COMMAND" >&2
    exit 1
  fi
done
for TASK_UI_COMMAND in solotask vibeboard task-master-ui; do
  ln -sfn "$TASK_UI_INSTALL_DIR/bin/vibeboard.mjs" "$TASK_UI_BIN_DIR/$TASK_UI_COMMAND"
done
echo "SoloTask: see what your agents are building."
echo "Installed. Run: solotask /path/to/project"
echo "Made by Aemal Sayer. Learn to build with AI agents in his workshops: https://aemalsayer.com"
case ":$PATH:" in *":$TASK_UI_BIN_DIR:"*) ;; *) printf 'Add this directory to PATH: %s\n' "$TASK_UI_BIN_DIR" ;; esac
