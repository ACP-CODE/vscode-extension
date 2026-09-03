import { spawnSync, execSync } from "child_process";
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const [action, ...rest] = args;

if (!action) {
    console.error("请指定 action，例如 dev / build / tauri / wdio / astro ...");
    process.exit(1);
}

const cwd = process.cwd();

// 💡 优化 1：引入路径内存缓存，避免一个生命周期内重复调用 pnpm 命令
const packagePathCache = {};

/**
 * 核心：通过 pnpm filter 动态获取包的绝对物理路径
 * 无论包在 packages/、apps/、还是嵌套目录下，都能准确命中
 */
function getPackageRealPath(name) {
    if (!name) return null;
    if (packagePathCache[name]) return packagePathCache[name];

    try {
        // 利用 pnpm list --filter 快速获取单个包的元数据
        const rawJson = execSync(`pnpm list --filter ${name} --json`, { stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" });
        const listData = JSON.parse(rawJson);
        if (listData && listData[0] && listData[0].path) {
            packagePathCache[name] = listData[0].path;
            return packagePathCache[name];
        }
    } catch (e) {
        // 没找到包或未匹配到，返回 null 即可
    }
    return null;
}

// 💡 优化 2：判断是否为合法的 Workspace 包，只需看能不能解析出真实物理路径
function isWorkspaceTarget(name) {
    return !!getPackageRealPath(name);
}

// 统一解析 target 与透传参数（保持你原有的精妙设计不变）
function resolveTargetAndArgs() {
    const explicitIdx = rest.findIndex((a) => /^--(app|target)=/.test(a));
    if (explicitIdx !== -1) {
        const target = rest[explicitIdx].split("=")[1];
        const extraArgs = [...rest.slice(0, explicitIdx), ...rest.slice(explicitIdx + 1)];
        return { target, extraArgs };
    }

    const targetIdx = rest.findIndex((token) => isWorkspaceTarget(token));
    if (targetIdx !== -1) {
        const target = rest[targetIdx];
        const extraArgs = [...rest.slice(0, targetIdx), ...rest.slice(targetIdx + 1)];
        return { target, extraArgs };
    }

    return { target: process.env.npm_package_config_app, extraArgs: rest };
}

// 统一执行 vpr 并处理退出码
function runVpr(vprArgs) {
    const result = spawnSync("vpr", vprArgs, { stdio: "inherit", shell: true });
    if (result.error) {
        console.error(`执行失败: ${result.error.message}`);
        process.exit(result.status || 1);
    }
    process.exit(result.status || 0);
}

const { target, extraArgs } = resolveTargetAndArgs();

if (!target) {
    console.error(
        "未指定 target（或 -e2e 对应的基础 app），请设置 npm_package_config_app 或通过参数传入",
    );
    process.exit(1);
}

const e2eActions = ["wdio", "test:e2e"];
if (e2eActions.includes(action)) {
    const cmd = action === "test:e2e" ? "test" : action;
    runVpr(["--filter", `${target}-e2e`, cmd, ...extraArgs]);
}

// 💡 优化 3：因为我们已经拿到了绝对路径，判断 Tauri 变得无比简单直接！
const targetDir = getPackageRealPath(target);
const isTauri = targetDir && fs.existsSync(path.join(targetDir, "src-tauri"));

const baseArgs = ["--filter", target];

if (action === "dev" || action === "build") {
    baseArgs.push(...(isTauri ? ["tauri", action] : [action]));
} else if (action === "tauri" && !isTauri) {
    console.error(`应用 ${target} 并非 Tauri 项目（未在路径 ${targetDir} 找到 src-tauri 目录）`);
    process.exit(1);
} else {
    baseArgs.push(action);
}

runVpr([...baseArgs, ...extraArgs]);
