import datetime
from decimal import Decimal
from uuid import UUID

from app.application.ports.outbound.manager_repository import ManagerRepository


class SyncRateCalendarUseCase:
    def __init__(self, repo: ManagerRepository):
        self._repo = repo

    async def execute(self, room_type_id: UUID) -> None:
        # 1. Fetch all tariffs for the room type
        tariffs = await self._repo.get_room_tariffs(room_type_id)
        base = tariffs.get("base")
        if not base:
            return

        seasonal_rules = tariffs.get("seasonal_rules", [])
        base_price = base["base_price"]
        weekend_premium_pct = base["weekend_premium"]

        # 2. Get all rate plans for this room type
        rate_plan_ids = await self._repo.list_rate_plans_for_room_type(room_type_id)
        if not rate_plan_ids:
            return

        # 3. Calculate prices for the next 365 days
        today = datetime.date.today()
        prices = []
        for i in range(366):
            day = today + datetime.timedelta(days=i)
            price = base_price

            # Apply weekend premium if Fri (4) or Sat (5) night
            # In Python, Monday is 0, Sunday is 6. Friday is 4, Saturday is 5.
            if day.weekday() in (4, 5):
                price += base_price * (weekend_premium_pct / Decimal("100"))

            # Apply seasonal rules (highest adjustment wins)
            # Find rules that apply to this day
            active_rules = [
                r for r in seasonal_rules
                if r["start_date"] <= day <= r["end_date"]
            ]
            
            if active_rules:
                # Calculate the adjusted price for each rule and take the maximum
                # (Or we could sum them up, but usually highest wins in hotel industry for markups)
                # Here we'll just apply them in order of priority or simply take the max adjustment if they are markups.
                # Let's just find the max price among all applied rules.
                rule_prices = []
                for rule in active_rules:
                    if rule["adjustment_type"] == "PERCENT":
                        adj_price = price + (price * (rule["adjustment_value"] / Decimal("100")))
                    else: # FIXED
                        adj_price = price + rule["adjustment_value"]
                    rule_prices.append(adj_price)
                
                price = max(rule_prices)

            prices.append({
                "day": day,
                "price_amount": price.quantize(Decimal("0.01"))
            })

        # 4. Update rate calendar for each rate plan
        for rp_id in rate_plan_ids:
            await self._repo.update_rate_calendar(rp_id, prices)
