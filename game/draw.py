"""Рисунок от первого лица: стойка внизу, окно и улица впереди."""

from __future__ import annotations

import math
import random
import sys
from pathlib import Path

import pygame

from game.content import STATIONS, STEP_NAMES, VESSELS
from game.sim import Game

WIDTH = 1280
HEIGHT = 720
INK = (42, 36, 28)
PAPER = (243, 234, 216)
WALL = (232, 223, 206)
COUNTER = (214, 196, 168)
NIGHT = (28, 32, 40)
WINDOW_X = 3.55

_fonts: dict[int, pygame.font.Font] = {}
_font_file: str | None = None


def _font_file_path() -> str | None:
    global _font_file
    if _font_file is not None:
        return _font_file or None
    root = Path(__file__).resolve().parent
    names = ("DejaVuSans.ttf", "PatrickHand-Regular.ttf") if sys.platform == "emscripten" else ("PatrickHand-Regular.ttf", "DejaVuSans.ttf")
    found: list[Path] = []
    for folder in (root, Path("/data/data/poslednyaya/assets/game"), Path("game")):
        for name in names:
            path = folder / name
            if path.is_file() and path not in found:
                found.append(path)
    for path in found:
        try:
            probe = pygame.font.Font(str(path), 48)
            sample = probe.render("П", True, (0, 0, 0))
        except Exception as exc:
            print("font fail", path, exc)
            continue
        ink = 0
        for y in range(sample.get_height()):
            for x in range(sample.get_width()):
                if sample.get_at((x, y)).a > 40:
                    ink += 1
        if ink > 12:
            _font_file = str(path)
            return _font_file
        print("font blank", path.name, ink)
    print("font missing", __file__)
    _font_file = ""
    return None


def font(size: int) -> pygame.font.Font:
    cached = _fonts.get(size)
    if cached:
        return cached
    path = _font_file_path()
    if path:
        face = pygame.font.Font(path, size)
    else:
        fallback = pygame.font.match_font("dejavusans") or pygame.font.match_font("freesans")
        face = pygame.font.Font(fallback, size) if fallback else pygame.font.Font(None, size + 6)
    _fonts[size] = face
    return face


def project(world_x: float, depth: float, player_x: float) -> tuple[float, float]:
    parallax = 140 + depth * 540
    sx = WIDTH / 2 + (world_x - player_x) * parallax
    sy = 168 + depth * 360
    return sx, sy


def wobble(surf: pygame.Surface, color: tuple[int, int, int], a: tuple[float, float], b: tuple[float, float], seed: int, width: int = 2) -> None:
    rng = random.Random(seed)
    points = [a]
    steps = 4
    for i in range(1, steps):
        t = i / steps
        points.append((a[0] + (b[0] - a[0]) * t + rng.uniform(-4, 4), a[1] + (b[1] - a[1]) * t + rng.uniform(-3, 3)))
    points.append(b)
    pygame.draw.lines(surf, color, False, points, width)


def text(surf: pygame.Surface, value: str, xy: tuple[int, int], size: int = 22, color: tuple[int, int, int] = INK) -> None:
    face = font(size)
    surf.blit(face.render(value, True, color), xy)


def station_points(game: Game) -> list[tuple[str, float, float]]:
    return [(sid, *project(wx, 0.8, game.x)) for sid, _label, wx in STATIONS]


def station_at(game: Game, mx: float, my: float) -> str | None:
    best = None
    dist = 78
    for sid, sx, sy in station_points(game):
        gap = math.hypot(mx - sx, my - sy)
        if gap < dist:
            dist = gap
            best = sid
    return best


def dialogue_rects() -> list[pygame.Rect]:
    return [pygame.Rect(740, 430 + i * 82, 490, 72) for i in range(3)]


def draw(surf: pygame.Surface, game: Game) -> None:
    surf.fill(PAPER)
    draw_wall(surf, game)
    draw_counter(surf, game)
    draw_stations(surf, game)
    draw_hands(surf, game)
    draw_hud(surf, game)
    if game.mode == "title":
        draw_title(surf, game)
    elif game.mode == "intro":
        draw_sheet(surf, "У окна", "Люди подходят к стеклу. Стрелки влево и вправо — вдоль стойки. Клавиша E, на русской раскладке это У, делает то, что перед руками. 1–4 — выбрать чашку.")
    elif game.mode == "dialogue" and game.dialogue:
        draw_dialogue(surf, game)
    elif game.mode == "pause":
        draw_sheet(surf, "Пауза", "Esc — вернуться к стойке. Enter — закрыть смену.")
    elif game.mode == "report":
        draw_sheet(
            surf,
            f"День {game.day} закрыт",
            f"Выручка {game.money} руб. Отдано у окна: {game.served}. Ошибок: {game.mistakes}. Ушли сами: {game.left}. Enter — следующее утро.",
        )


def draw_wall(surf: pygame.Surface, game: Game) -> None:
    pygame.draw.rect(surf, WALL, (0, 0, WIDTH, 430))
    for i, y in enumerate((70, 150, 230, 320)):
        wobble(surf, INK, (20, y), (WIDTH - 20, y + (i % 2) * 6), 10 + i, 1)
    wx, _wy = project(WINDOW_X, 0.18, game.x)
    rect = pygame.Rect(0, 0, 440, 340)
    rect.midbottom = (int(wx), 470)
    street = NIGHT if game.night else (186, 204, 214)
    prev = surf.get_clip()
    surf.set_clip(rect)
    pygame.draw.rect(surf, street, rect)
    rng = random.Random(3)
    for i in range(18):
        pygame.draw.circle(surf, INK, (rect.x + 20 + rng.randrange(rect.w - 30), rect.y + 16 + rng.randrange(40)), 2)
    if game.night:
        tick = pygame.time.get_ticks() // 90
        for i in range(14):
            drop_y = rect.y + ((i * 37 + tick) % rect.h)
            pygame.draw.circle(surf, (220, 226, 230), (rect.x + 16 + i * 24, drop_y), 1)
    for guest in game.customers:
        draw_guest(surf, rect, guest, game.night)
    surf.set_clip(prev)
    wobble(surf, INK, rect.topleft, rect.topright, 21, 3)
    wobble(surf, INK, rect.topright, rect.bottomright, 22, 3)
    wobble(surf, INK, rect.bottomright, rect.bottomleft, 23, 3)
    wobble(surf, INK, rect.bottomleft, rect.topleft, 24, 3)
    wobble(surf, INK, (rect.centerx, rect.top), (rect.centerx + 4, rect.bottom), 25, 1)
    text(surf, "улица", (rect.x + 8, rect.y + 6), 18)


def draw_guest(surf: pygame.Surface, rect: pygame.Rect, guest, night: bool) -> None:
    if guest.state == "leave":
        t = min(1.2, guest.approach)
        cx = rect.x + rect.w * (0.5 + t * 0.4)
        scale = max(0.35, 1.25 - t * 0.55)
        foot = 392 - t * 30
    else:
        t = guest.approach
        cx = rect.x + rect.w * (0.14 + t * 0.18)
        scale = 0.5 + t * 0.85
        foot = 392 - (1 - t) * 100
    color = (232, 230, 224) if night else INK
    draw_stick(surf, cx, foot, scale, hash(guest.spec.id) % 1000, guest.spec.look, color)
    if guest.state in ("wait", "wait_drink", "talk") and scale > 0.8:
        label = font(18).render(guest.spec.name, True, INK)
        surf.blit(label, (cx - label.get_width() / 2, foot - 128 * scale))


def draw_stick(surf: pygame.Surface, cx: float, foot: float, scale: float, seed: int, look: str, color: tuple[int, int, int]) -> None:
    def p(ox: float, oy: float) -> tuple[float, float]:
        return cx + ox * scale, foot + oy * scale

    head = p(0, -86)
    wobble(surf, color, p(0, -70), p(1, -34), seed + 1, 2)
    wobble(surf, color, p(-2, -52), p(-26, -48), seed + 2, 2)
    wobble(surf, color, p(2, -52), p(26, -46), seed + 3, 2)
    wobble(surf, color, p(0, -34), p(-14, -4), seed + 4, 2)
    wobble(surf, color, p(0, -34), p(14, -2), seed + 5, 2)
    radius = max(4, int(13 * scale))
    pygame.draw.circle(surf, color, (int(head[0]), int(head[1])), radius, 2)
    pygame.draw.circle(surf, color, (int(head[0] - 4 * scale), int(head[1])), max(1, int(2 * scale)))
    pygame.draw.circle(surf, color, (int(head[0] + 4 * scale), int(head[1])), max(1, int((2.6 if look == "hood" else 2) * scale)))
    if look == "hood":
        pygame.draw.circle(surf, color, (int(head[0]), int(head[1] - 2 * scale)), int(radius * 1.45), 2)
        wobble(surf, color, p(8, -96), p(18, -70), seed + 7, 2)
    if look == "group":
        extra = p(22, -80)
        pygame.draw.circle(surf, color, (int(extra[0]), int(extra[1])), max(3, int(9 * scale)), 2)
        pygame.draw.circle(surf, color, (int(extra[0] - 3 * scale), int(extra[1])), 1)
        pygame.draw.circle(surf, color, (int(extra[0] + 3 * scale), int(extra[1])), 1)


def draw_counter(surf: pygame.Surface, game: Game) -> None:
    pygame.draw.rect(surf, COUNTER, (0, 400, WIDTH, HEIGHT - 400))
    wobble(surf, INK, (0, 408), (WIDTH, 414), 30, 3)
    for i, wx in enumerate((-1.6, -0.5, 0.6, 1.7, 2.8, 3.6)):
        sx, _sy = project(wx, 0.72, game.x)
        if -40 < sx < WIDTH + 40:
            wobble(surf, INK, (sx, 420), (sx + 6, 560), 40 + i, 1)


def draw_stations(surf: pygame.Surface, game: Game) -> None:
    here = game.nearest()
    current = here[0] if here else ""
    for sid, label, wx in STATIONS:
        sx, sy = project(wx, 0.8, game.x)
        if sx < -120 or sx > WIDTH + 120:
            continue
        draw_tool(surf, sid, sx, sy, 50 + int(wx * 10), game)
        if sid == current:
            for i in range(5):
                pygame.draw.circle(surf, INK, (int(sx - 16 + i * 8), int(sy + 48)), 2)
        face = font(20)
        label_img = face.render(label, True, INK)
        surf.blit(label_img, (sx - label_img.get_width() / 2, sy + 54))


def draw_tool(surf: pygame.Surface, sid: str, sx: float, sy: float, seed: int, game: Game) -> None:
    if sid == "machine":
        wobble(surf, INK, (sx - 34, sy - 20), (sx + 34, sy - 20), seed, 2)
        wobble(surf, INK, (sx + 34, sy - 20), (sx + 30, sy + 36), seed + 1, 2)
        wobble(surf, INK, (sx + 30, sy + 36), (sx - 30, sy + 34), seed + 2, 2)
        wobble(surf, INK, (sx - 30, sy + 34), (sx - 34, sy - 20), seed + 3, 2)
        pygame.draw.circle(surf, INK, (int(sx - 8), int(sy)), 8, 2)
        pygame.draw.circle(surf, INK, (int(sx + 14), int(sy + 2)), 3)
        if game.brewing > 0:
            pygame.draw.circle(surf, INK, (int(sx), int(sy - 28 - (pygame.time.get_ticks() // 120) % 12)), 2)
    elif sid == "cups":
        for i, dx in enumerate((-30, -10, 10, 30)):
            cup(surf, sx + dx, sy + 8, 0.55, seed + i)
    elif sid == "milk":
        wobble(surf, INK, (sx - 12, sy - 24), (sx + 12, sy - 18), seed, 2)
        wobble(surf, INK, (sx + 12, sy - 18), (sx + 16, sy + 28), seed + 1, 2)
        wobble(surf, INK, (sx + 16, sy + 28), (sx - 16, sy + 28), seed + 2, 2)
        wobble(surf, INK, (sx - 16, sy + 28), (sx - 12, sy - 24), seed + 3, 2)
    elif sid == "steam":
        wobble(surf, INK, (sx, sy + 30), (sx + 8, sy - 20), seed, 2)
        wobble(surf, INK, (sx + 8, sy - 20), (sx + 28, sy - 8), seed + 1, 2)
        pygame.draw.circle(surf, INK, (int(sx + 30), int(sy - 6)), 3)
    elif sid == "water":
        wobble(surf, INK, (sx - 18, sy + 10), (sx, sy - 28), seed, 2)
        wobble(surf, INK, (sx, sy - 28), (sx + 20, sy + 8), seed + 1, 2)
        wobble(surf, INK, (sx - 18, sy + 10), (sx + 20, sy + 8), seed + 2, 2)
    elif sid == "tea":
        wobble(surf, INK, (sx - 16, sy - 8), (sx + 16, sy - 8), seed, 2)
        wobble(surf, INK, (sx + 16, sy - 8), (sx + 14, sy + 24), seed + 1, 2)
        wobble(surf, INK, (sx + 14, sy + 24), (sx - 14, sy + 24), seed + 2, 2)
        wobble(surf, INK, (sx - 14, sy + 24), (sx - 16, sy - 8), seed + 3, 2)
        pygame.draw.circle(surf, INK, (int(sx), int(sy + 6)), 2)
    elif sid == "sink":
        wobble(surf, INK, (sx - 36, sy), (sx + 36, sy), seed, 2)
        wobble(surf, INK, (sx + 36, sy), (sx + 28, sy + 28), seed + 1, 2)
        wobble(surf, INK, (sx + 28, sy + 28), (sx - 28, sy + 28), seed + 2, 2)
        wobble(surf, INK, (sx - 28, sy + 28), (sx - 36, sy), seed + 3, 2)
    elif sid == "rest":
        pygame.draw.circle(surf, INK, (int(sx), int(sy - 10)), 10, 2)
        wobble(surf, INK, (sx, sy), (sx, sy + 28), seed, 2)
        text(surf, "Нина", (int(sx) - 24, int(sy) - 46), 16)
    elif sid == "window":
        wobble(surf, INK, (sx - 28, sy + 6), (sx + 28, sy + 4), seed, 2)
        wobble(surf, INK, (sx - 28, sy + 6), (sx - 24, sy + 22), seed + 1, 2)
        wobble(surf, INK, (sx + 28, sy + 4), (sx + 24, sy + 22), seed + 2, 2)
        pygame.draw.circle(surf, INK, (int(sx), int(sy - 16)), 5, 2)


def cup(surf: pygame.Surface, sx: float, sy: float, scale: float, seed: int) -> None:
    w, h = 16 * scale, 18 * scale
    wobble(surf, INK, (sx - w, sy - h), (sx + w, sy - h), seed, 2)
    wobble(surf, INK, (sx + w, sy - h), (sx + w * 0.8, sy + h), seed + 1, 2)
    wobble(surf, INK, (sx + w * 0.8, sy + h), (sx - w * 0.8, sy + h), seed + 2, 2)
    wobble(surf, INK, (sx - w * 0.8, sy + h), (sx - w, sy - h), seed + 3, 2)


def draw_hands(surf: pygame.Surface, game: Game) -> None:
    wobble(surf, INK, (430, 720), (575, 615), 80, 3)
    wobble(surf, INK, (575, 615), (545, 590), 81, 2)
    wobble(surf, INK, (575, 615), (600, 588), 84, 2)
    wobble(surf, INK, (850, 720), (705, 615), 82, 3)
    wobble(surf, INK, (705, 615), (735, 590), 83, 2)
    wobble(surf, INK, (705, 615), (680, 588), 85, 2)
    if game.cup:
        cup(surf, 640, 600, 1.4, 90)
        marks = game.cup.steps[:4]
        for i, step in enumerate(marks):
            pygame.draw.circle(surf, INK, (620 + i * 12, 600), 3 if step == "espresso" else 2)
        text(surf, VESSELS[game.cup.vessel], (560, 650), 18)


def draw_hud(surf: pygame.Surface, game: Game) -> None:
    text(surf, f"день {game.day}   {game.clock}   {game.phase}   {game.money} руб.", (24, 16), 26)
    note = font(22).render(game.recipe_card(), True, INK)
    pygame.draw.rect(surf, PAPER, (24, 52, note.get_width() + 16, 36), 0)
    pygame.draw.rect(surf, INK, (24, 52, note.get_width() + 16, 36), 2)
    surf.blit(note, (32, 58))
    if game.logs:
        text(surf, game.logs[-1], (24, 96), 20)
    hint = font(28).render(game.hint(), True, INK)
    surf.blit(hint, (WIDTH / 2 - hint.get_width() / 2, HEIGHT - 42))
    guest = game.front()
    if guest and guest.state in ("wait", "wait_drink", "approach"):
        dots = max(0, min(5, round(guest.patience / guest.spec.patience * 5)))
        text(surf, guest.spec.name, (WIDTH - 220, 16), 22)
        for i in range(5):
            pygame.draw.circle(surf, INK, (WIDTH - 200 + i * 16, 52), 3, 0 if i < dots else 1)


def draw_sheet(surf: pygame.Surface, title: str, body: str) -> None:
    rect = pygame.Rect(240, 180, 800, 300)
    pygame.draw.rect(surf, PAPER, rect)
    pygame.draw.rect(surf, INK, rect, 3)
    text(surf, title, (270, 210), 36)
    words = body.split()
    line = ""
    y = 270
    for word in words:
        trial = (line + " " + word).strip()
        if font(24).size(trial)[0] > 720:
            text(surf, line, (270, y), 24)
            y += 32
            line = word
        else:
            line = trial
    text(surf, line, (270, y), 24)


def draw_title(surf: pygame.Surface, game: Game) -> None:
    draw_sheet(surf, "Последняя чашка", "Ты за стойкой. Гости подходят к окну, а ты двигаешься вдоль бара и собираешь чашку. Enter — начать смену.")


def draw_dialogue(surf: pygame.Surface, game: Game) -> None:
    guest = game.dialogue
    if not guest:
        return
    rect = pygame.Rect(80, 430, 620, 250)
    pygame.draw.rect(surf, PAPER, rect)
    pygame.draw.rect(surf, INK, rect, 3)
    text(surf, guest.spec.name, (100, 448), 28)
    words = guest.spec.hello.split()
    line = ""
    y = 490
    for word in words:
        trial = (line + " " + word).strip()
        if font(22).size(trial)[0] > 560:
            text(surf, line, (100, y), 22)
            y += 28
            line = word
        else:
            line = trial
    text(surf, line, (100, y), 22)
    for rect_i, choice in zip(dialogue_rects(), guest.spec.choices):
        pygame.draw.rect(surf, PAPER, rect_i)
        pygame.draw.rect(surf, INK, rect_i, 2)
        text(surf, choice.text, (rect_i.x + 12, rect_i.y + 22), 20)
