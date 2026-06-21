# Frutiger Hangout ✦

A chill social multiplayer hangout game inspired by **Frutiger Space** — the future we were promised!

Explore a tropical Frutiger Aqua resort, customize your Webiie avatar, chat with friends on WIM (Web Instant Messenger), collect Frutiger Orbs, and just vibe.

## Features

- **5 Huge Zones** — Frutiger Aqua, Frutiger Eco, Technozen, Sky Garden, Coral Lagoon (500×500 map!)
- **Rigged Webiie Avatars** — Arms, legs, blinking eyes, glass body, smooth walk/run/jump/dance animations
- **WIM Messenger** — MSN-style chat, friends list, private messages, nudge, status messages
- **5 Minigames** — Orb Rush, Bubble Pop, Fruit Frenzy, Zen Race, Cloud Dash (press F at kiosks)
- **Multiplayer** — See other players in real-time, wave, dance, float on bubbles
- **Bloom lighting**, zone-specific skies, minimap (Tab), 60+ collectible orbs

## Quick Start

```bash
npm install
npm start
```

Open **http://localhost:3847** in your browser.

## Controls

| Key | Action |
|-----|--------|
| WASD | Move (camera-relative — feels natural!) |
| Right-drag | Rotate camera |
| Scroll | Zoom in/out |
| Shift | Run |
| Space | Jump |
| E | Sit / Stand |
| F | Start minigame (at kiosk) |
| Tab | Toggle world map |
| C | Open Customizer |
| M | Toggle Messenger |
| Enter | Focus world chat |

## Zones

| Zone | Direction from spawn | Vibe |
|------|---------------------|------|
| Frutiger Aqua | Center (spawn) | Beach resort, pool |
| Frutiger Eco | West (follow path left) | Green hills, wind turbines |
| Technozen | East (follow path right) | Zen future pavilion |
| Sky Garden | North | Floating cloud platforms |
| Coral Lagoon | South | Shallow tropical lagoon |

## Tech Stack

- **Three.js** — 3D rendering
- **Node.js + Express** — Static file server
- **WebSockets (ws)** — Real-time multiplayer

---

*Frutiger Hangout is a fan-made tribute. Frutiger Space™ is by Studio Ginestra.*
