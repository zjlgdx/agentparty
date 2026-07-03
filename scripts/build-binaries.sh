#!/usr/bin/env bash
# 手动出「当前平台」的 party 二进制 + tar.gz + sha256（本地验证/应急用）。
# CI 的 release.yml 才是 5 平台交叉编译的正式发布链路，这里只出本机一份。
#
# 用法:
#   scripts/build-binaries.sh                # 版本取 cli/package.json
#   AGENTPARTY_VERSION=1.2.3 scripts/build-binaries.sh
#   OUT_DIR=/tmp/out scripts/build-binaries.sh
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

command -v bun >/dev/null || { echo "error: 需要 bun (https://bun.sh)" >&2; exit 1; }

# 探本机 target，映射到 bun 三元组
os="$(uname -s)"; arch="$(uname -m)"
case "$os" in
  Linux)  os_part="linux" ;;
  Darwin) os_part="darwin" ;;
  MINGW*|MSYS*|CYGWIN*) os_part="windows" ;;
  *) echo "error: 不支持的系统 $os" >&2; exit 1 ;;
esac
case "$arch" in
  x86_64|amd64) arch_part="x64" ;;
  arm64|aarch64) arch_part="arm64" ;;
  *) echo "error: 不支持的架构 $arch" >&2; exit 1 ;;
esac
target="bun-${os_part}-${arch_part}"
ext=""; [ "$os_part" = "windows" ] && ext=".exe"

version="${AGENTPARTY_VERSION:-$(bun --print "require('./cli/package.json').version")}"
out_dir="${OUT_DIR:-$repo_root/dist}"
mkdir -p "$out_dir"

echo "==> install deps"
bun install --frozen-lockfile

echo "==> compile ($target)"
( cd cli && bun build --compile --target="$target" ./src/index.ts --outfile "party${ext}" )

# 资产名与 install.sh/ps1 请求一致：party-<os>-<arch>.tar.gz（用作 file:// 离线 mirror 时可直接命中）
pkg="party-${os_part}-${arch_part}.tar.gz"
echo "==> package $pkg"
tar -czf "$out_dir/$pkg" -C cli "party${ext}"
( cd "$out_dir" && sha256sum "$pkg" > "${pkg}.sha256" )

echo "==> done"
echo "  $out_dir/$pkg"
echo "  $out_dir/${pkg}.sha256"
