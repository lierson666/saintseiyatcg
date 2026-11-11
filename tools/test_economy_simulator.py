"""Testes sem banco de dados para o simulador exploratório."""
import importlib.util
import unittest
from pathlib import Path
spec = importlib.util.spec_from_file_location("simulator", Path(__file__).with_name("economy-simulator.py"))
s = importlib.util.module_from_spec(spec)
spec.loader.exec_module(s)

class EconomySimulation(unittest.TestCase):
    def test_live_constants(self):
        self.assertEqual(sum(s.server.WIN_COINS), 650)
        self.assertEqual(s.PACK_PRICE, 1000)
        self.assertEqual(s.server.WELCOME_BOOSTERS, 3)
        self.assertEqual(len(s.server.CHRONICLE_MISSIONS) * s.server.CHRONICLE_COINS, 3250)
        self.assertEqual(sum(s.server.CHRONICLE_BOOSTERS(m) for m in s.server.CHRONICLE_MISSIONS), 19)

    def test_monotonic(self):
        for p in s.PROFILES:
            self.assertLess(s.simulate(p, 30)["total_earned_coins"], s.simulate(p, 180)["total_earned_coins"])
            self.assertGreaterEqual(s.simulate(p, 180, 500)["total_earned_coins"], s.simulate(p, 180)["total_earned_coins"])

    def test_no_paid_currency_and_no_double_saga(self):
        for p in s.PROFILES:
            r = s.simulate(p, 180)
            self.assertEqual(r["chronicle_coins"], 3250)
            self.assertEqual(r["free_boosters"], 22)
            self.assertEqual(r["total_booster_equivalent"], r["total_earned_coins"] // 1000 + 22)

if __name__ == "__main__":
    unittest.main()
