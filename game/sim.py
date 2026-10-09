"""Смена за стойкой: движение, напиток, гости у окна."""

from __future__ import annotations

import random
from dataclasses import dataclass, field

from game.content import GUESTS, GUEST_BY_ID, RECIPES, REACH, STATIONS, STEP_NAMES, VESSELS, X_MAX, X_MIN, GuestDef


@dataclass
class Cup:
    vessel: str
    steps: list[str] = field(default_factory=list)

    def label(self) -> str:
        bits = [VESSELS[self.vessel]]
        bits.extend(STEP_NAMES[step] for step in self.steps)
        return ", ".join(bits)


@dataclass
class Customer:
    uid: int
    spec: GuestDef
    state: str
    approach: float
    patience: float
    line: str
    served: bool = False


@dataclass
class Game:
    rng: random.Random = field(default_factory=random.Random)
    mode: str = "title"
    day: int = 1
    minute: int = 8 * 60
    x: float = 3.55
    walk_target: float | None = None
    cup: Cup | None = None
    customers: list[Customer] = field(default_factory=list)
    uid: int = 1
    money: int = 0
    served: int = 0
    mistakes: int = 0
    left: int = 0
    logs: list[str] = field(default_factory=list)
    dialogue: Customer | None = None
    order_name: str = ""
    order_recipe: str = ""
    order_uid: int = 0
    brewing: float = 0.0
    spawn_in: float = 1.0
    nina_for: float = 0.0
    interact_lock: float = 0.0
    intro_left: bool = True
    time_acc: float = 0.0

    def log(self, text: str) -> None:
        self.logs.append(text)
        del self.logs[:-6]

    @property
    def clock(self) -> str:
        hour, minute = divmod(max(0, self.minute), 60)
        return f"{hour:02d}:{minute:02d}"

    @property
    def night(self) -> bool:
        return self.minute >= 21 * 60

    @property
    def phase(self) -> str:
        if self.minute < 12 * 60:
            return "утро"
        if self.minute < 17 * 60:
            return "день"
        if self.minute < 21 * 60:
            return "вечер"
        return "ночь"

    def start(self) -> None:
        self.mode = "intro" if self.intro_left else "play"
        if self.mode == "play":
            self.spawn_in = 0.4

    def begin_play(self) -> None:
        self.intro_left = False
        self.mode = "play"
        self.spawn_in = 0.3

    def nearest(self) -> tuple[str, str, float] | None:
        best = None
        dist = REACH
        for sid, label, sx in STATIONS:
            gap = abs(self.x - sx)
            if gap < dist:
                dist = gap
                best = (sid, label, sx)
        return best

    def move(self, direction: float, dt: float) -> None:
        if self.mode != "play":
            return
        if direction:
            self.walk_target = None
            self.x += direction * 1.45 * dt
        elif self.walk_target is not None:
            delta = self.walk_target - self.x
            if abs(delta) < 0.03:
                self.x = self.walk_target
                self.walk_target = None
            else:
                step = 1.45 * dt
                self.x += step if delta > 0 else -step
        self.x = min(X_MAX, max(X_MIN, self.x))

    def walk_to(self, world_x: float) -> None:
        if self.mode != "play":
            return
        self.walk_target = min(X_MAX, max(X_MIN, world_x))

    def press_number(self, number: int) -> None:
        if self.mode == "dialogue" and self.dialogue:
            self.choose(number - 1)
            return
        if self.mode != "play":
            return
        here = self.nearest()
        if not here or here[0] != "cups":
            return
        kinds = ("small", "mug", "wide", "tea")
        if 1 <= number <= 4:
            self.take_cup(kinds[number - 1])

    def interact(self) -> None:
        if self.interact_lock > 0 or self.mode != "play":
            return
        here = self.nearest()
        if not here:
            self.log("Сдвинься вдоль стойки к нужной точке.")
            return
        self.interact_lock = 0.2
        sid = here[0]
        if sid == "cups":
            self.log("1 маленькая, 2 кружка, 3 широкая, 4 чайная.")
        elif sid == "machine":
            self.start_brew()
        elif sid == "water":
            self.add_step("water")
        elif sid == "milk":
            self.add_step("milk")
        elif sid == "steam":
            self.add_steam()
        elif sid == "tea":
            self.add_step("tea")
        elif sid == "sink":
            self.dump()
        elif sid == "rest":
            self.rest()
        elif sid == "window":
            self.at_window()

    def take_cup(self, vessel: str) -> None:
        if self.cup:
            self.log("В руках уже есть чашка. Сначала мойка.")
            return
        self.cup = Cup(vessel)
        self.log(f"Взяла {VESSELS[vessel]}.")

    def add_step(self, step: str) -> None:
        if not self.cup:
            self.log("Сначала чашка.")
            return
        if step in self.cup.steps:
            self.log("Это уже в чашке.")
            return
        self.cup.steps.append(step)
        self.log(f"Добавлено: {STEP_NAMES[step]}.")

    def start_brew(self) -> None:
        if not self.cup:
            self.log("Нужна чашка под эспрессо.")
            return
        if "espresso" in self.cup.steps:
            self.log("Эспрессо уже налит.")
            return
        self.brewing = 0.01
        self.log("Кофемашина шумит. Побудь рядом.")

    def add_steam(self) -> None:
        if not self.cup or "milk" not in self.cup.steps:
            self.log("Сначала молоко, потом пар.")
            return
        self.add_step("steam")

    def dump(self) -> None:
        if not self.cup and self.brewing <= 0:
            self.log("Мыть нечего.")
            return
        self.cup = None
        self.brewing = 0
        self.log("Чашка вылита. Можно взять другую.")

    def rest(self) -> None:
        self.nina_for = 18
        self.log("Короткая пауза. Нина смотрит на окно.")

    def at_window(self) -> None:
        guest = self.front()
        if not guest or guest.state in ("approach", "leave"):
            self.log("К стеклу ещё никто не дошёл.")
            return
        if guest.state == "wait":
            self.mode = "dialogue"
            self.dialogue = guest
            guest.state = "talk"
            return
        if guest.state == "wait_drink":
            self.serve(guest)

    def choose(self, index: int) -> None:
        guest = self.dialogue
        if self.mode != "dialogue" or not guest:
            return
        if index < 0 or index >= len(guest.spec.choices):
            return
        choice = guest.spec.choices[index]
        guest.patience = min(guest.spec.patience, guest.patience + choice.patience)
        guest.state = "wait_drink"
        guest.line = guest.spec.order_line
        self.order_recipe = guest.spec.recipe
        self.order_name = guest.spec.name
        self.order_uid = guest.uid
        self.dialogue = None
        self.mode = "play"
        recipe = RECIPES[guest.spec.recipe]
        need = " + ".join((VESSELS[recipe.vessel], *(STEP_NAMES[s] for s in recipe.steps)))
        self.log(f"{guest.spec.name}: {choice.reply}")
        self.log(f"Заказ: {recipe.name}. {need}.")

    def serve(self, guest: Customer) -> None:
        if guest.served or guest.uid != self.order_uid:
            return
        recipe = RECIPES.get(self.order_recipe)
        if not recipe or not self.cup:
            self.log("Неси готовую чашку к окну.")
            return
        if self.cup.vessel == recipe.vessel and tuple(self.cup.steps) == recipe.steps:
            guest.served = True
            guest.state = "leave"
            guest.approach = 0
            guest.line = "Забирает чашку и отходит."
            self.money += recipe.price
            self.served += 1
            self.cup = None
            self.clear_order()
            self.log(f"{recipe.name} у окна. +{recipe.price} руб.")
            return
        guest.patience -= 18
        self.mistakes += 1
        self.log("Не тот напиток. Чашка при тебе: вылей или переделай.")

    def clear_order(self) -> None:
        self.order_recipe = ""
        self.order_name = ""
        self.order_uid = 0

    def front(self) -> Customer | None:
        for guest in self.customers:
            if guest.state != "leave":
                return guest
        return None

    def tick(self, dt: float) -> None:
        if self.mode != "play":
            return
        self.interact_lock = max(0, self.interact_lock - dt)
        self.nina_for = max(0, self.nina_for - dt)
        self.time_acc += dt
        while self.time_acc >= 0.45:
            self.time_acc -= 0.45
            self.minute += 1
        if self.brewing > 0:
            here = self.nearest()
            if not here or here[0] != "machine":
                self.brewing = 0
                self.log("Отошла от машины. Эспрессо не долит.")
            else:
                self.brewing += dt
                if self.brewing >= 1.15:
                    self.brewing = 0
                    self.add_step("espresso")
                    self.log("Эспрессо готов.")
        self.spawn_in -= dt
        if self.spawn_in <= 0 and self.front() is None:
            self.spawn()
            self.spawn_in = 22 if not self.night else 34
        drain_mul = 0.45 if self.nina_for > 0 else 1
        for guest in self.customers:
            if guest.state == "approach":
                guest.approach = min(1, guest.approach + dt * 0.2)
                if guest.approach >= 1:
                    guest.state = "wait"
                    guest.line = guest.spec.hello
            elif guest.state == "leave":
                guest.approach += dt * 0.55
            elif guest.state in ("wait", "wait_drink"):
                guest.patience -= guest.spec.drain * drain_mul * dt * 1.4
                if guest.patience <= 0:
                    self.abandon(guest)
        self.customers = [c for c in self.customers if not (c.state == "leave" and c.approach >= 1.35)]
        if self.minute >= 23 * 60:
            self.finish()

    def abandon(self, guest: Customer) -> None:
        if guest.state == "leave":
            return
        guest.state = "leave"
        guest.approach = 0
        guest.line = "Уходит, не дождавшись."
        self.left += 1
        if guest.uid == self.order_uid:
            self.clear_order()
        self.log(f"{guest.spec.name} не дождался у окна.")

    def spawn(self, guest_id: str | None = None) -> Customer | None:
        spec = GUEST_BY_ID[guest_id] if guest_id else self.pick_guest()
        if not spec:
            return None
        guest = Customer(self.uid, spec, "approach", 0.0, spec.patience, "идёт к окну")
        self.uid += 1
        self.customers.append(guest)
        return guest

    def pick_guest(self) -> GuestDef | None:
        pool = [g for g in GUESTS if g.min_day <= self.day and (not g.night or self.night or self.rng.random() < 0.18)]
        if not pool:
            pool = list(GUESTS)
        if self.night:
            pool = pool + [g for g in GUESTS if g.night]
        return self.rng.choice(pool)

    def finish(self) -> None:
        if self.mode in ("report", "title"):
            return
        self.mode = "report"
        self.brewing = 0
        self.dialogue = None
        self.walk_target = None

    def next_day(self) -> None:
        self.day += 1
        self.minute = 8 * 60
        self.customers.clear()
        self.cup = None
        self.brewing = 0
        self.served = 0
        self.mistakes = 0
        self.left = 0
        self.logs.clear()
        self.clear_order()
        self.x = 3.55
        self.spawn_in = 0.4
        self.nina_for = 0
        self.mode = "play"
        self.log(f"Утро дня {self.day}. Окно снова открыто.")

    def recipe_card(self) -> str:
        if not self.order_recipe:
            return "Заказа нет"
        recipe = RECIPES[self.order_recipe]
        steps = " → ".join((VESSELS[recipe.vessel], *(STEP_NAMES[s] for s in recipe.steps)))
        return f"{self.order_name}: {recipe.name}. {steps}"

    def hint(self) -> str:
        if self.mode == "dialogue":
            return "1, 2 или 3"
        here = self.nearest()
        if not here:
            return "стрелки ← → вдоль стойки"
        sid, label, _ = here
        if sid == "cups":
            return "1–4 выбрать чашку"
        if sid == "machine":
            return "E или У — варить эспрессо"
        if sid == "window":
            guest = self.front()
            if guest and guest.state == "approach":
                return "к окну идут"
            if guest and guest.state == "wait_drink":
                return "E или У — отдать чашку в окно"
            if guest and guest.state == "wait":
                return "E или У — принять заказ"
            return "у окна пока пусто"
        if sid == "sink":
            return "E или У — вылить чашку"
        if sid == "rest":
            return "E или У — пауза, Нина у окна"
        return f"E или У — {label}"
