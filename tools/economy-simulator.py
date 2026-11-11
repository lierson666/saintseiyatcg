#!/usr/bin/env python3
"""Simulador exploratório de economia SSTCG. Não acessa banco nem altera saldos.

Usa constantes REAIS de sanctuary-api/server.py. Não simula sorteio de cartas,
crafting, duplicatas ou comportamento observado. Resultados são cenários,
não previsões ou valores de usuários.
"""
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "sanctuary-api"))
import server

PROFILES = {
    "casual": {"active_days_per_week": 2, "wins_per_active_day": 1},
    "regular": {"active_days_per_week": 5, "wins_per_active_day": 3},
    "competitive": {"active_days_per_week": 7, "wins_per_active_day": 5},
}
DAYS = (7, 30, 90, 180)
PACK_PRICE = server.PRICES[server.BOOSTER]


def simulate(profile, days, daily_mission=0, chronicle=True):
    """Estimativa determinística com distribuição de dias ativos por semana."""
    cfg = PROFILES[profile]
    wallet = 0
    earned_wins = 0
    earned_missions = 0
    active = 0
    for day in range(days):
        # Dias ativos distribuídos de forma fixa: viés pequeno em janelas curtas.
        if (day % 7) >= cfg["active_days_per_week"]:
            continue
        active += 1
        wins = cfg["wins_per_active_day"]
        earned_wins += sum(server.WIN_COINS[:wins])
        earned_missions += daily_mission
    wallet = earned_wins + earned_missions
    # Chronicle concluído uma vez durante o horizonte. Esta hipótese é explícita.
    saga_coins = len(server.CHRONICLE_MISSIONS) * server.CHRONICLE_COINS if chronicle and days >= 30 else 0
    saga_boosters = sum(server.CHRONICLE_BOOSTERS(m) for m in server.CHRONICLE_MISSIONS) if chronicle and days >= 30 else 0
    welcome_boosters = server.WELCOME_BOOSTERS
    wallet += saga_coins
    # Equivalente em boosters sem considerar crafting, descontos, wildcard ou duplicatas.
    return {
        "profile": profile, "days": days, "active_days": active,
        "duel_coins": earned_wins, "daily_mission_coins": earned_missions,
        "chronicle_coins": saga_coins, "total_earned_coins": wallet,
        "free_boosters": saga_boosters + welcome_boosters,
        "max_single_boosters_if_all_coins_spent": wallet // PACK_PRICE,
        "total_booster_equivalent": wallet // PACK_PRICE + saga_boosters + welcome_boosters,
        "unspent_coins_if_only_single_boosters": wallet % PACK_PRICE,
    }


def run():
    parser = argparse.ArgumentParser()
    parser.add_argument("--daily-mission", type=int, choices=(0, 500, 750), default=0)
    parser.add_argument("--json", action="store_true")
    a = parser.parse_args()
    rows = [simulate(name, days, a.daily_mission) for days in DAYS for name in PROFILES]
    if a.json:
        print(json.dumps({"daily_mission": a.daily_mission, "results": rows}, indent=2))
    else:
        print(f"MISSION_PER_ACTIVE_DAY={a.daily_mission} CC | 1 booster={PACK_PRICE} CC | saga assumed complete at >=30d")
        print("profile       days active   wins_CC  missions_CC  saga_CC  total_CC   free_packs  booster_equiv")
        for r in rows:
            print(f"{r['profile']:12} {r['days']:4} {r['active_days']:6} {r['duel_coins']:9} {r['daily_mission_coins']:12} {r['chronicle_coins']:8} {r['total_earned_coins']:9} {r['free_boosters']:12} {r['total_booster_equivalent']:13}")
    return rows


if __name__ == "__main__":
    run()
