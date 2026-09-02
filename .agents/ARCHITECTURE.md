## 目录结构

- .agents（主要是agents相关的文档）
    - ARCHITECTURE.md (蓝图)
    - MEMORIES.md （日志）
- .github
    - ISSUE_TEMPLATE
    - workflows（github action 相关的配置，暂未设定）
- apps
    - vscode（vscode 插件开发的样板）
        - src
        - tests
        - scripts
            - vscode_docs.mts (根据 package.json 生成 VSCode 扩展的 README.md 中的配置部分。未来可能还需与迭代)
        - .vscodeignore
        - .vscode-test.mjs
        - rolldown.config.ts
- docs
- examples（该插件需要用的测试例子）
- packages （可共享复用函数或工具库）
- scripts
    - run.mjs （铁律，基本已稳定，日后可能需要迭代更新）
- package.json
- pnpm-workpsace.yaml （workspace 配置）
- vite.config.ts （vite-plus 配置）

