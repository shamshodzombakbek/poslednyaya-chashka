"""Проверка смены без окна: заказ, сборка, выдача, отказ чужой чашки."""

from __future__ import annotations

import random

from game.content import X_MIN
from game.sim import Game


def play_until_window(game: Game) -> None:
    game.x = 3.55
    for _ in range(40):
        if game.front() and game.front().state == "wait":
            return
        game.tick(0.2)
    raise AssertionError("гость не дошёл до окна")


def test_cappuccino() -> None:
    game = Game(rng=random.Random(1))
    game.begin_play()
    game.customers.clear()
    game.spawn("sonya")
    play_until_window(game)
    game.interact()
    assert game.mode == "dialogue"
    game.choose(0)
    assert game.order_recipe == "cappuccino"
    game.x = 2.85
    game.take_cup("wide")
    game.x = 2.2
    game.start_brew()
    for _ in range(12):
        game.tick(0.15)
    assert game.cup and "espresso" in game.cup.steps
    game.x = 0.9
    game.add_step("milk")
    game.x = 1.55
    game.add_steam()
    game.x = 3.55
    game.interact()
    assert game.money == 190, game.money
    assert game.served == 1
    game.interact()
    assert game.money == 190


def test_wrong_cup() -> None:
    game = Game(rng=random.Random(2))
    game.begin_play()
    game.customers.clear()
    game.spawn("igor")
    play_until_window(game)
    game.interact()
    game.choose(0)
    game.take_cup("small")
    game.x = 2.2
    game.start_brew()
    for _ in range(12):
        game.tick(0.15)
    game.x = 3.55
    game.interact()
    assert game.money == 0
    assert game.mistakes == 1
    assert game.cup is not None


def test_move_limit() -> None:
    game = Game()
    game.mode = "play"
    game.x = 0
    game.move(-1, 10)
    assert game.x == X_MIN


def main() -> None:
    test_move_limit()
    test_cappuccino()
    test_wrong_cup()
    print("ok")


if __name__ == "__main__":
    main()
