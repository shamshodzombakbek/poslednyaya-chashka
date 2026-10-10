"""Окно игры. Управление здесь, правила смены в sim."""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

import pygame

from game.content import STATIONS
from game.draw import HEIGHT, WIDTH, dialogue_rects, draw, station_at
from game.sim import Game

SAVE = Path(__file__).resolve().parents[1] / "save.json"
SAVE_KEY = "poslednyaya-chashka"


def _browser() -> bool:
    return sys.platform == "emscripten"


def load_save() -> dict | None:
    try:
        if _browser():
            import js

            raw = js.localStorage.getItem(SAVE_KEY)
            if not raw:
                return None
            data = json.loads(str(raw))
        elif SAVE.exists():
            data = json.loads(SAVE.read_text(encoding="utf-8"))
        else:
            return None
    except (OSError, json.JSONDecodeError, ValueError):
        return None
    if not isinstance(data, dict):
        return None
    return data


def write_save(game: Game) -> None:
    payload = json.dumps({"day": game.day + 1, "money": game.money}, ensure_ascii=False)
    try:
        if _browser():
            import js

            js.localStorage.setItem(SAVE_KEY, payload)
        else:
            SAVE.write_text(payload, encoding="utf-8")
    except OSError:
        return


def apply_save(game: Game, data: dict) -> None:
    game.day = int(data.get("day", 1))
    game.money = int(data.get("money", 0))
    game.intro_left = False
    game.begin_play()


async def main() -> None:
    pygame.init()
    pygame.display.set_caption("Последняя чашка")
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    clock = pygame.time.Clock()
    game = Game()
    saved = load_save()
    running = True
    while running:
        dt = min(0.05, clock.tick(60) / 1000)
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                held.add(event.scancode)
                held_keys.add(event.key)
                running = on_key(game, event, saved) and running
            elif event.type == pygame.KEYUP:
                held.discard(event.scancode)
                held_keys.discard(event.key)
            elif event.type in (
                code
                for code in (
                    getattr(pygame, "WINDOWFOCUSLOST", None),
                    getattr(pygame, "WINDOWMINIMIZED", None),
                )
                if code is not None
            ):
                held.clear()
                held_keys.clear()
            elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                on_click(game, event.pos, saved)
        if game.mode == "play":
            direction = 0
            pressed = pygame.key.get_pressed()
            if held & LEFT_SCAN or held_keys & LEFT_KEYS or pressed[pygame.K_LEFT] or pressed[pygame.K_a]:
                direction -= 1
            if held & RIGHT_SCAN or held_keys & RIGHT_KEYS or pressed[pygame.K_RIGHT] or pressed[pygame.K_d]:
                direction += 1
            game.move(direction, dt)
            game.tick(dt)
            if game.mode == "report":
                write_save(game)
                saved = load_save()
        draw(screen, game)
        pygame.display.flip()
        await asyncio.sleep(0)
    pygame.quit()


def _scan(name: str, fallback: int) -> int:
    return int(getattr(pygame, name, fallback))


LEFT_SCAN = {_scan("KSCAN_A", 4), _scan("KSCAN_LEFT", 80)}
RIGHT_SCAN = {_scan("KSCAN_D", 7), _scan("KSCAN_RIGHT", 79)}
USE_SCAN = {_scan("KSCAN_E", 8)}
NUM_SCAN = {
    _scan("KSCAN_1", 30): 1,
    _scan("KSCAN_2", 31): 2,
    _scan("KSCAN_3", 32): 3,
    _scan("KSCAN_4", 33): 4,
}
SCAN_RETURN = _scan("KSCAN_RETURN", 40)
SCAN_SPACE = _scan("KSCAN_SPACE", 44)
SCAN_ESCAPE = _scan("KSCAN_ESCAPE", 41)
SCAN_C = _scan("KSCAN_C", 6)
LEFT_KEYS = {pygame.K_LEFT, pygame.K_a}
RIGHT_KEYS = {pygame.K_RIGHT, pygame.K_d}
held: set[int] = set()
held_keys: set[int] = set()


def letter(event: pygame.event.Event) -> str:
    return (event.unicode or "").lower()


def is_use(event: pygame.event.Event) -> bool:
    return event.scancode in USE_SCAN or letter(event) in ("e", "у")


def is_confirm(event: pygame.event.Event) -> bool:
    return event.scancode in (SCAN_RETURN, SCAN_SPACE) or event.key in (pygame.K_RETURN, pygame.K_SPACE)


def on_key(game: Game, event: pygame.event.Event, saved: dict | None) -> bool:
    key = event.key
    if event.scancode == SCAN_ESCAPE or key == pygame.K_ESCAPE:
        if game.mode == "play":
            game.mode = "pause"
        elif game.mode == "pause":
            game.mode = "play"
        return True
    if game.mode == "title" and is_confirm(event):
        game.start()
        return True
    if game.mode == "intro" and (is_confirm(event) or is_use(event)):
        game.begin_play()
        return True
    if game.mode == "pause" and is_confirm(event):
        game.finish()
        write_save(game)
        return True
    if game.mode == "report" and is_confirm(event):
        game.next_day()
        return True
    number = NUM_SCAN.get(event.scancode)
    if number is None and key in (pygame.K_1, pygame.K_2, pygame.K_3, pygame.K_4):
        number = key - pygame.K_0
    if number:
        game.press_number(number)
        return True
    if is_use(event) and game.mode == "play":
        game.interact()
    if (event.scancode == SCAN_C or letter(event) in ("c", "с")) and game.mode == "title" and saved:
        apply_save(game, saved)
    return True


def on_click(game: Game, pos: tuple[int, int], saved: dict | None) -> None:
    if game.mode == "title":
        game.start()
        return
    if game.mode == "intro":
        game.begin_play()
        return
    if game.mode == "report":
        game.next_day()
        return
    if game.mode == "dialogue":
        for index, rect in enumerate(dialogue_rects()):
            if rect.collidepoint(pos):
                game.choose(index)
        return
    if game.mode != "play":
        return
    sid = station_at(game, pos[0], pos[1])
    if not sid:
        return
    here = game.nearest()
    wx = next(x for station_id, _label, x in STATIONS if station_id == sid)
    if here and here[0] == sid:
        game.interact()
    else:
        game.walk_to(wx)


if __name__ == "__main__":
    asyncio.run(main())
