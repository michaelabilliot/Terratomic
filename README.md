# 🌎 Terratomic.io

[![Join Discord](https://img.shields.io/discord/1380341945603330148?label=Join%20Us%20on%20Discord&logo=discord&style=for-the-badge)](https://discord.gg/JNZbp4pg5y)


**Terratomic.io** is a fast-paced real-time strategy game focused on **territorial conquest**, **alliance-building**, and **resource management**.

It is a fork of [OpenFront.io](https://github.com/openfrontio/OpenFrontIO), which itself is based on [WarFront.io](https://github.com/WarFrontIO).

## 💬 Why This Fork

While OpenFront laid a strong foundation, Terratomic takes a different approach — placing community feedback and collaborative development at the core of its roadmap. 

This project aims to evolve based on what players actually want, with transparent priorities and active community input shaping the game's future.

This is a game built *with* its players, not just *for* them.

## 🤝 Contributing

Whether you're here to squash bugs, prototype new mechanics, or improve the UI, here's how to get started:

```bash
git clone https://github.com/1brucben/Terratomic.git
cd Terratomic
npm install
npm run dev
```

You're now ready to start developing locally. A formal contribution guide will be published soon.

Until then, open issues, submit pull requests or join the discussion [on Discord](https://discord.gg/JNZbp4pg5y) — we're listening.

## 🗂️ Project Structure

- `src/client` – Game frontend (components, graphics, styles, utilities)
- `src/core` – Shared game logic (execution, game state, pathfinding, validations)
- `src/server` – Backend services (session control, matchmaking, gatekeeping)
- `src/scripts` – Dev or build-time scripts
- `resources/` – Static assets (flags, fonts, icons, maps, sprites, images)
- `tests/` – Unit and integration tests for client, core logic, and utilities

## 🛠 Licensing

- `src/client`: GPLv3
- `src/core` and `src/server`: MIT

© 2025 Terratomic Team